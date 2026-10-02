const BASE = process.env.API_URL || "http://localhost:5001/api";
let pass = 0, fail = 0;
const failures = [];
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; failures.push(name + (extra ? " -> " + extra : "")); } };

class Client {
  constructor() { this.cookie = ""; }
  async req(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined
    });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) { const [pair] = c.split(";"); if (pair.startsWith("token=")) this.cookie = pair.endsWith("=") ? "" : pair; }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data, set };
  }
}

const a = new Client(), b = new Client();
const stamp = Date.now();
const emailA = `a${stamp}@test.com`, emailB = `b${stamp}@test.com`;

// ---- auth
let r = await a.req("GET", "/tasks"); ok("unauth tasks 401", r.status === 401);
r = await a.req("POST", "/auth/register", { name: "A", email: "bad", password: "1" }); ok("register invalid 400", r.status === 400 && r.data.fields?.email);
r = await a.req("POST", "/auth/register", { name: "Alice", email: emailA, password: "password1" });
ok("register 201", r.status === 201 && r.data.user.email === emailA);
ok("cookie httpOnly", r.set.some(c => c.startsWith("token=") && /HttpOnly/i.test(c)), r.set.join("|"));
ok("no passwordHash leaked", !JSON.stringify(r.data).includes("passwordHash"));
r = await a.req("POST", "/auth/register", { name: "Alice", email: emailA.toUpperCase(), password: "password1" }); ok("duplicate email 409 (case-insens)", r.status === 409, r.status);
r = await a.req("GET", "/auth/me"); ok("me ok", r.status === 200 && r.data.user.name === "Alice");
r = await a.req("PATCH", "/auth/me", { name: "Alice B" }); ok("rename", r.status === 200 && r.data.user.name === "Alice B");
r = await new Client().req("POST", "/auth/login", { email: emailA, password: "wrongpass1" }); ok("wrong password 401", r.status === 401);
r = await new Client().req("POST", "/auth/login", { email: "nobody@test.com", password: "wrongpass1" }); ok("unknown user 401 same msg", r.status === 401 && r.data.message === "Incorrect email or password");
r = await new Client().req("POST", "/auth/login", { email: { $ne: null }, password: { $ne: null } }); ok("NoSQL injection rejected 400", r.status === 400, r.status);
r = await new Client().req("POST", "/auth/login", "{bad json"); ok("malformed json 400", r.status === 400);
const a2 = new Client(); r = await a2.req("POST", "/auth/login", { email: emailA, password: "password1" }); ok("login ok", r.status === 200 && a2.cookie.startsWith("token="));
r = await b.req("POST", "/auth/register", { name: "Bob", email: emailB, password: "password2" }); ok("register user B", r.status === 201);
r = await new Client().req("GET", "/tasks", undefined, { Cookie: "token=garbage" }); ok("bad token 401", r.status === 401);

// ---- tasks CRUD
r = await a.req("POST", "/tasks", { title: "   " }); ok("empty title 400", r.status === 400);
r = await a.req("POST", "/tasks", { title: "x".repeat(141) }); ok("long title 400", r.status === 400);
r = await a.req("POST", "/tasks", { title: "Pay rent", priority: "Urgent" }); ok("bad priority 400", r.status === 400);
const due = new Date(Date.now() + 86400000).toISOString();
r = await a.req("POST", "/tasks", { title: "Pay rent", notes: "Transfer to landlord", priority: "High", labels: ["Bills", "bills", "Home"], dueAt: due, allDay: false, repeat: "weekly", checklist: [{ text: "Open app", done: false }] });
ok("create 201", r.status === 201 && r.data.task.priority === "High");
ok("labels deduped+lowercased", JSON.stringify(r.data.task.labels) === '["bills","home"]', JSON.stringify(r.data.task.labels));
const t1 = r.data.task;
ok("owner not exposed wrongly / defaults", t1.status === "Pending" && t1.archived === false && t1.trashedAt === null);
r = await a.req("POST", "/tasks", { title: "Buy milk" }); const t2 = r.data.task;
r = await a.req("POST", "/tasks", { title: "Write report", priority: "Low", labels: ["work"] }); const t3 = r.data.task;
r = await a.req("GET", "/tasks"); ok("list 3", r.status === 200 && r.data.tasks.length === 3, r.data?.tasks?.length);
r = await a.req("GET", "/tasks?search=milk"); ok("search title", r.data.tasks.length === 1 && r.data.tasks[0].title === "Buy milk");
r = await a.req("GET", "/tasks?search=landlord"); ok("search notes", r.data.tasks.length === 1);
r = await a.req("GET", "/tasks?search=" + encodeURIComponent(".*")); ok("regex chars escaped", r.status === 200 && r.data.tasks.length === 0);
r = await a.req("GET", "/tasks?label=work"); ok("label filter", r.data.tasks.length === 1 && r.data.tasks[0]._id === t3._id);
r = await a.req("GET", "/tasks?priority=High"); ok("priority filter", r.data.tasks.length === 1);
r = await a.req("GET", "/tasks?sort=priority"); ok("sort priority", r.data.tasks[0].priority === "High" && r.data.tasks[2].priority === "None", r.data.tasks.map(t => t.priority).join());
r = await a.req("GET", "/tasks?sort=due"); ok("sort due puts dated first", r.data.tasks[0]._id === t1._id);
r = await a.req("GET", `/tasks/${t1._id}`); ok("get one", r.status === 200 && r.data.task.title === "Pay rent");
r = await a.req("GET", "/tasks/not-an-id"); ok("invalid id 400", r.status === 400);
r = await a.req("GET", "/tasks/64b7f0f0f0f0f0f0f0f0f0f0"); ok("missing id 404", r.status === 404);

// ---- isolation
r = await b.req("GET", "/tasks"); ok("B sees none", r.data.tasks.length === 0);
r = await b.req("GET", `/tasks/${t1._id}`); ok("B cannot read A task", r.status === 404);
r = await b.req("PATCH", `/tasks/${t1._id}`, { title: "hacked" }); ok("B cannot edit A task", r.status === 404);
r = await b.req("DELETE", `/tasks/${t1._id}`); ok("B cannot trash A task", r.status === 404);
r = await b.req("DELETE", `/tasks/${t1._id}/permanent`); ok("B cannot hard-delete A task", r.status === 404);
r = await b.req("POST", "/tasks/bulk", { ids: [t1._id, t2._id], action: "trash" }); ok("B bulk trash affects 0", r.status === 200 && r.data.affected === 0, JSON.stringify(r.data));
r = await b.req("POST", `/tasks/${t1._id}/focus`, { minutes: 10 }); ok("B cannot log focus on A task", r.status === 404);
r = await a.req("GET", `/tasks/${t1._id}`); ok("A task untouched", r.data.task.title === "Pay rent" && !r.data.task.trashedAt);

// ---- update + recurrence
r = await a.req("PATCH", `/tasks/${t2._id}`, { status: "In Progress" }); ok("status in progress", r.data.task.status === "In Progress" && r.data.task.completedAt === null);
r = await a.req("PATCH", `/tasks/${t2._id}`, { status: "Completed" }); ok("completed sets completedAt", !!r.data.task.completedAt && r.data.next === null);
r = await a.req("PATCH", `/tasks/${t2._id}`, { status: "Pending" }); ok("reopen clears completedAt", r.data.task.completedAt === null);
r = await a.req("PATCH", `/tasks/${t1._id}`, { checklist: [{ _id: t1.checklist[0]._id, text: "Open app", done: true }, { text: "Send money", done: false }] });
ok("checklist update + new item id", r.data.task.checklist.length === 2 && r.data.task.checklist[0].done === true && !!r.data.task.checklist[1]._id);
r = await a.req("PATCH", `/tasks/${t1._id}`, { checklist: [{ _id: "bad", text: "x", done: false }] }); ok("bad checklist id 400", r.status === 400, r.status);
r = await a.req("PATCH", `/tasks/${t1._id}`, { status: "Completed" });
ok("recurring spawns next", r.data.next && r.data.next.status === "Pending" && r.data.next.repeat === "weekly" && new Date(r.data.next.dueAt) > new Date());
ok("next checklist reset", r.data.next.checklist.every(i => i.done === false) && r.data.next.checklist.length === 2);
const nextId = r.data.next._id;
r = await a.req("PATCH", `/tasks/${t1._id}`, { dueAt: "garbage" }); ok("bad date 400", r.status === 400);
r = await a.req("PATCH", `/tasks/${t3._id}`, { dueAt: due, allDay: true }); ok("set due", !!r.data.task.dueAt);
r = await a.req("PATCH", `/tasks/${t3._id}`, { dueAt: null }); ok("clear due", r.data.task.dueAt === null);
r = await a.req("PATCH", `/tasks/${t3._id}`, { pinned: true }); ok("pin", r.data.task.pinned === true);
r = await a.req("GET", "/tasks"); ok("pinned sorted first", r.data.tasks[0]._id === t3._id);
r = await a.req("POST", `/tasks/${t3._id}/focus`, { minutes: 25 }); ok("focus logs", r.data.task.focusMinutes === 25);
r = await a.req("POST", `/tasks/${t3._id}/focus`, { minutes: 0 }); ok("focus 0 rejected", r.status === 400);

// ---- archive / trash
r = await a.req("PATCH", `/tasks/${t3._id}`, { archived: true }); ok("archive unpins", r.data.task.archived && !r.data.task.pinned);
r = await a.req("GET", "/tasks?view=active"); ok("archived hidden from active", !r.data.tasks.some(t => t._id === t3._id));
r = await a.req("GET", "/tasks?view=archived"); ok("in archived view", r.data.tasks.length === 1 && r.data.tasks[0]._id === t3._id);
r = await a.req("DELETE", `/tasks/${t2._id}`); ok("trash", r.status === 200 && !!r.data.task.trashedAt);
r = await a.req("DELETE", `/tasks/${t2._id}`); ok("trash twice 404", r.status === 404);
r = await a.req("GET", "/tasks?view=trash"); ok("in trash view", r.data.tasks.length === 1);
r = await a.req("GET", "/tasks"); ok("not in active", !r.data.tasks.some(t => t._id === t2._id));
r = await a.req("POST", `/tasks/${t2._id}/restore`); ok("restore", r.status === 200 && r.data.task.trashedAt === null);
r = await a.req("DELETE", `/tasks/${t2._id}`); r = await a.req("DELETE", `/tasks/${t2._id}/permanent`); ok("permanent delete", r.status === 200);
r = await a.req("GET", `/tasks/${t2._id}`); ok("gone", r.status === 404);

// ---- bulk
r = await a.req("POST", "/tasks/bulk", { ids: [], action: "trash" }); ok("bulk empty 400", r.status === 400);
r = await a.req("POST", "/tasks/bulk", { ids: ["bad"], action: "trash" }); ok("bulk bad id 400", r.status === 400);
r = await a.req("POST", "/tasks/bulk", { ids: [t1._id, nextId], action: "status", status: "In Progress" }); ok("bulk status", r.data.affected === 2, JSON.stringify(r.data));
r = await a.req("POST", "/tasks/bulk", { ids: [t1._id, nextId], action: "status" }); ok("bulk status requires value", r.status === 400);
r = await a.req("POST", "/tasks/bulk", { ids: [t1._id, nextId], action: "delete" }); ok("bulk hard delete only trashed", r.data.affected === 0, JSON.stringify(r.data));
r = await a.req("POST", "/tasks/bulk", { ids: [t1._id, nextId], action: "trash" }); ok("bulk trash", r.data.affected === 2);
r = await a.req("POST", "/tasks/bulk", { ids: [t1._id], action: "restore" }); ok("bulk restore", r.data.affected === 1);
r = await a.req("POST", "/tasks/bulk", { ids: [nextId], action: "delete" }); ok("bulk delete trashed", r.data.affected === 1);
r = await a.req("DELETE", "/tasks/trash"); ok("empty trash ok", r.status === 200);

// ---- stats, labels, upcoming
r = await a.req("POST", "/tasks", { title: "Due soon", dueAt: new Date(Date.now() - 60000).toISOString(), allDay: false }); const t4 = r.data.task;
r = await a.req("POST", "/tasks", { title: "Done today", status: "Completed" });
r = await a.req("GET", `/tasks/stats?tz=${new Date().getTimezoneOffset()}`);
ok("stats shape", r.status === 200 && typeof r.data.total === "number" && r.data.week.length === 7, JSON.stringify(r.data));
ok("stats overdue counts", r.data.overdue >= 1, JSON.stringify(r.data));
ok("stats streak >=1 with completion today", r.data.streak >= 1 && r.data.doneToday >= 1, JSON.stringify(r.data));
r = await a.req("GET", "/tasks/labels"); ok("labels counts", r.status === 200 && Array.isArray(r.data.counts) && r.data.labels.includes("bills"), JSON.stringify(r.data));
r = await a.req("GET", "/tasks/upcoming"); ok("upcoming returns just-due timed task", r.data.tasks.some(t => t._id === t4._id), JSON.stringify(r.data));
r = await b.req("GET", "/tasks/labels"); ok("labels isolated", r.data.labels.length === 0);

// ---- security
r = await a.req("POST", "/tasks", { title: "evil" }, { Origin: "http://evil.com" }); ok("evil origin blocked", r.status === 403, r.status);
r = await a.req("POST", "/tasks", { title: "good origin" }, { Origin: "http://localhost:5173" }); ok("allowed origin ok", r.status === 201, r.status);
r = await a.req("GET", "/nope"); ok("unknown route 404 json", r.status === 404 && r.data?.message);
r = await a.req("POST", "/tasks", { title: "x", __proto__: { admin: true }, user: "64b7f0f0f0f0f0f0f0f0f0f0" }); ok("cannot spoof user field", r.status === 201 && r.data.task.user !== "64b7f0f0f0f0f0f0f0f0f0f0");
r = await a.req("POST", "/auth/logout"); ok("logout", r.status === 200);
r = await a.req("GET", "/auth/me"); ok("after logout me 401", r.status === 401);

console.log(`\nPASS ${pass}  FAIL ${fail}`);
failures.forEach(f => console.log("  ✗ " + f));
process.exit(fail ? 1 : 0);
