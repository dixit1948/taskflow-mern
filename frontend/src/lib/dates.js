export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export function formatDue(task, now = new Date()) {
  if (!task.dueAt) return "";
  const d = new Date(task.dueAt);
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 864e5);
  let day;
  if (diff === 0) day = "Today";
  else if (diff === 1) day = "Tomorrow";
  else if (diff === -1) day = "Yesterday";
  else if (diff > 1 && diff < 7) day = d.toLocaleDateString(undefined, { weekday: "long" });
  else {
    day = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {})
    });
  }
  return task.allDay ? day : `${day}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export const isOverdue = (task, now = new Date()) =>
  Boolean(task.dueAt) && task.status !== "Completed" && new Date(task.dueAt) < now;

const pad = n => String(n).padStart(2, "0");

export const toInputDate = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const toInputTime = (iso, allDay) => {
  if (!iso || allDay) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function fromInputs(date, time) {
  if (!date) return { dueAt: null, allDay: true };
  const [y, m, d] = date.split("-").map(Number);
  if (time) {
    const [h, min] = time.split(":").map(Number);
    return { dueAt: new Date(y, m - 1, d, h, min).toISOString(), allDay: false };
  }
  return { dueAt: new Date(y, m - 1, d, 23, 59).toISOString(), allDay: true };
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export const formatMinutes = min => {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h}h ${min % 60}m` : `${h}h`;
};
