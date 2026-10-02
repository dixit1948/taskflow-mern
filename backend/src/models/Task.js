import mongoose from "mongoose";

export const STATUSES = ["Pending", "In Progress", "Completed"];
export const PRIORITIES = ["None", "Low", "Medium", "High"];
export const COLORS = ["default", "sage", "sky", "butter", "blush", "lilac", "sand"];
export const REPEATS = ["none", "daily", "weekly", "monthly"];

const checklistItem = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    notes: { type: String, default: "", maxlength: 4000 },
    status: { type: String, enum: STATUSES, default: "Pending" },
    priority: { type: String, enum: PRIORITIES, default: "None" },
    dueAt: { type: Date, default: null },
    allDay: { type: Boolean, default: true },
    labels: { type: [String], default: [] },
    color: { type: String, enum: COLORS, default: "default" },
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
    checklist: { type: [checklistItem], default: [] },
    repeat: { type: String, enum: REPEATS, default: "none" },
    focusMinutes: { type: Number, default: 0 },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: "tasks_v2" }
);

taskSchema.index({ user: 1, trashedAt: 1, archived: 1, createdAt: -1 });
// Trashed tasks disappear automatically after 30 days.
taskSchema.index({ trashedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export default mongoose.model("Task", taskSchema);
