import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Task, { STATUSES, PRIORITIES, COLORS, REPEATS } from "../models/Task.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();
router.use(requireAuth);

router.param("id", (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : next(new AppError(400, "Invalid task id"))
);

/* ---------- validation ---------- */

const base = z.object({
  title: z.string().trim().min(1, "Give your task a title").max(140, "Title is too long"),
  notes: z.string().max(4000, "Notes are too long"),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  dueAt: z.string().datetime({ offset: true }).nullable(),
  allDay: z.boolean(),
  labels: z.array(z.string().trim().min(1).max(24)).max(8),
  color: z.enum(COLORS),
  pinned: z.boolean(),
  archived: z.boolean(),
  repeat: z.enum(REPEATS),
  checklist: z
    .array(
      z.object({
        _id: z.string().optional(),
        text: z.string().trim().min(1).max(200),
        done: z.boolean()
      })
    )
    .max(50)
});

const createSchema = base.partial().required({ title: true });
const updateSchema = base.partial();

const clean = input => {
  const data = { ...input };
  if ("dueAt" in data) data.dueAt = data.dueAt ? new Date(data.dueAt) : null;
  if (data.labels) data.labels = [...new Set(data.labels.map(label => label.toLowerCase()))];
  return data;
};

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------- helpers ---------- */

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1, None: 0 };
const time = value => (value ? new Date(value).getTime() : Infinity);

const sorters = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  due: (a, b) => time(a.dueAt) - time(b.dueAt),
  priority: (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
};

const advance = (date, repeat) => {
  const next = new Date(date);
  if (repeat === "daily") next.setDate(next.getDate() + 1);
  else if (repeat === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

async function spawnNext(task) {
  const now = new Date();
  let due = advance(task.dueAt || now, task.repeat);
  for (let i = 0; due < now && i < 400; i++) due = advance(due, task.repeat);

  return Task.create({
    user: task.user,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    labels: task.labels,
    color: task.color,
    repeat: task.repeat,
    allDay: task.allDay,
    dueAt: due,
    checklist: task.checklist.map(item => ({ text: item.text, done: false }))
  });
}

/* ---------- read ---------- */

router.get("/", async (req, res) => {
  const { view = "active", search = "", status, priority, label, sort = "newest" } = req.query;

  const query = { user: req.userId };
  if (view === "trash") {
    query.trashedAt = { $ne: null };
  } else {
    query.trashedAt = null;
    query.archived = view === "archived";
  }

  const term = String(search).trim().slice(0, 100);
  if (term) {
    const pattern = new RegExp(escapeRegex(term), "i");
    query.$or = [{ title: pattern }, { notes: pattern }, { labels: pattern }];
  }
  if (STATUSES.includes(status)) query.status = status;
  if (PRIORITIES.includes(priority)) query.priority = priority;
  if (label) query.labels = String(label).toLowerCase();

  const tasks = await Task.find(query).limit(500).lean();
  const sorter = sorters[sort] || sorters.newest;
  tasks.sort((a, b) => Number(b.pinned) - Number(a.pinned) || sorter(a, b));

  res.json({ tasks, total: tasks.length });
});

router.get("/labels", async (req, res) => {
  const counts = await Task.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId), trashedAt: null, archived: false } },
    { $unwind: "$labels" },
    { $group: { _id: "$labels", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({
    labels: counts.map(item => item._id),
    counts: counts.map(item => ({ label: item._id, count: item.count }))
  });
});

// Timed tasks that just came due (used for browser reminders).
router.get("/upcoming", async (req, res) => {
  const now = Date.now();
  const tasks = await Task.find({
    user: req.userId,
    trashedAt: null,
    archived: false,
    allDay: false,
    status: { $ne: "Completed" },
    dueAt: { $gte: new Date(now - 10 * 60_000), $lte: new Date(now + 60_000) }
  })
    .select("title dueAt")
    .lean();
  res.json({ tasks });
});

router.get("/stats", async (req, res) => {
  const offset = Number(req.query.tz) || 0; // minutes, from Date#getTimezoneOffset()
  const dayKey = date => new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);

  const now = new Date();
  const today = dayKey(now);
  const all = await Task.find({ user: req.userId, trashedAt: null })
    .select("status dueAt completedAt focusMinutes archived")
    .limit(5000)
    .lean();

  const live = all.filter(task => !task.archived);
  const open = live.filter(task => task.status !== "Completed");

  const doneByDay = new Map();
  for (const task of all) {
    if (task.status === "Completed" && task.completedAt) {
      const key = dayKey(new Date(task.completedAt));
      doneByDay.set(key, (doneByDay.get(key) || 0) + 1);
    }
  }

  const week = [];
  for (let i = 6; i >= 0; i--) {
    week.push(doneByDay.get(dayKey(new Date(now.getTime() - i * 864e5))) || 0);
  }

  let streak = 0;
  let cursor = doneByDay.get(today) ? 0 : 1;
  while (doneByDay.get(dayKey(new Date(now.getTime() - cursor * 864e5)))) {
    streak++;
    cursor++;
  }

  res.json({
    total: live.length,
    pending: live.filter(task => task.status === "Pending").length,
    inProgress: live.filter(task => task.status === "In Progress").length,
    completed: live.length - open.length,
    overdue: open.filter(task => task.dueAt && task.dueAt < now).length,
    dueToday: open.filter(task => task.dueAt && task.dueAt >= now && dayKey(task.dueAt) === today).length,
    doneToday: doneByDay.get(today) || 0,
    streak,
    week,
    focusMinutes: all.reduce((sum, task) => sum + (task.focusMinutes || 0), 0)
  });
});

/* ---------- write ---------- */

router.post("/", async (req, res) => {
  const data = clean(createSchema.parse(req.body));
  const task = await Task.create({
    ...data,
    user: req.userId,
    completedAt: data.status === "Completed" ? new Date() : null
  });
  res.status(201).json({ task });
});

router.post("/bulk", async (req, res) => {
  const { ids, action, status } = z
    .object({
      ids: z.array(z.string()).min(1).max(200),
      action: z.enum(["archive", "unarchive", "trash", "restore", "delete", "status"]),
      status: z.enum(STATUSES).optional()
    })
    .parse(req.body);

  if (!ids.every(id => mongoose.isValidObjectId(id))) throw new AppError(400, "Invalid task ids");

  const filter = { _id: { $in: ids }, user: req.userId };
  const now = new Date();
  let result;

  switch (action) {
    case "archive":
      result = await Task.updateMany({ ...filter, trashedAt: null }, { archived: true, pinned: false });
      break;
    case "unarchive":
      result = await Task.updateMany({ ...filter, trashedAt: null }, { archived: false });
      break;
    case "trash":
      result = await Task.updateMany({ ...filter, trashedAt: null }, { trashedAt: now, pinned: false });
      break;
    case "restore":
      result = await Task.updateMany(filter, { trashedAt: null });
      break;
    case "delete":
      result = await Task.deleteMany({ ...filter, trashedAt: { $ne: null } });
      break;
    case "status":
      if (!status) throw new AppError(400, "Choose a status");
      result = await Task.updateMany(
        { ...filter, trashedAt: null },
        { status, completedAt: status === "Completed" ? now : null }
      );
      break;
  }

  res.json({ affected: result.modifiedCount ?? result.deletedCount ?? 0 });
});

router.delete("/trash", async (req, res) => {
  const result = await Task.deleteMany({ user: req.userId, trashedAt: { $ne: null } });
  res.json({ affected: result.deletedCount });
});

router.get("/:id", async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.userId });
  if (!task) throw new AppError(404, "Task not found");
  res.json({ task });
});

router.patch("/:id", async (req, res) => {
  const data = clean(updateSchema.parse(req.body));
  const task = await Task.findOne({ _id: req.params.id, user: req.userId });
  if (!task) throw new AppError(404, "Task not found");

  const wasDone = task.status === "Completed";
  task.set(data);

  if (data.status === "Completed" && !wasDone) task.completedAt = new Date();
  if (data.status && data.status !== "Completed") task.completedAt = null;
  if (data.archived === true) task.pinned = false;
  if (data.pinned === true) task.archived = false;

  await task.save();

  const next = data.status === "Completed" && !wasDone && task.repeat !== "none" ? await spawnNext(task) : null;
  res.json({ task, next });
});

router.post("/:id/focus", async (req, res) => {
  const { minutes } = z.object({ minutes: z.number().int().min(1).max(240) }).parse(req.body);
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { $inc: { focusMinutes: minutes } },
    { new: true }
  );
  if (!task) throw new AppError(404, "Task not found");
  res.json({ task });
});

router.post("/:id/restore", async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { trashedAt: null },
    { new: true }
  );
  if (!task) throw new AppError(404, "Task not found");
  res.json({ task });
});

// Move to trash (recoverable for 30 days)
router.delete("/:id", async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId, trashedAt: null },
    { trashedAt: new Date(), pinned: false },
    { new: true }
  );
  if (!task) throw new AppError(404, "Task not found");
  res.json({ task });
});

router.delete("/:id/permanent", async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) throw new AppError(404, "Task not found");
  res.json({ message: "Task deleted forever" });
});

export default router;
