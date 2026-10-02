import { startOfDay } from "./dates.js";

const DAY_INDEX = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6
};
const DAY_RE = Object.keys(DAY_INDEX).sort((a, b) => b.length - a.length).join("|");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE =
  "january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec";

/**
 * Turns "Pay rent tomorrow 5pm !high #bills every month" into a structured task.
 * Everything it recognises is removed from the title.
 */
export function parseQuick(input, now = new Date()) {
  let s = ` ${input} `;
  const result = { title: "", priority: "None", labels: [], repeat: "none", dueAt: null, allDay: true };

  const take = (re, fn) => {
    const m = s.match(re);
    if (!m) return false;
    s = s.replace(re, " ");
    fn(m);
    return true;
  };

  take(/\s!(urgent|high|h|medium|med|m|low|l)(?=\s)/i, m => {
    const k = m[1].toLowerCase();
    result.priority = ["urgent", "high", "h"].includes(k) ? "High" : k[0] === "m" ? "Medium" : "Low";
  });

  while (take(/\s#([\w-]{1,24})(?=\s)/, m => result.labels.push(m[1].toLowerCase())));
  result.labels = [...new Set(result.labels)].slice(0, 8);

  let weekday = null;
  take(new RegExp(`\\severy\\s+(${DAY_RE})(?=\\s)`, "i"), m => {
    result.repeat = "weekly";
    weekday = DAY_INDEX[m[1].toLowerCase()];
  }) ||
    take(/\s(?:every\s+(day|week|month)|(daily|weekly|monthly))(?=\s)/i, m => {
      const k = (m[1] || m[2]).toLowerCase();
      result.repeat = k.startsWith("day") || k === "daily" ? "daily" : k.startsWith("week") ? "weekly" : "monthly";
    });

  let time = null;
  const setTime = (h, mi, ap) => {
    h = Number(h);
    mi = Number(mi || 0);
    if (ap) {
      ap = ap.toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
    }
    if (h <= 23 && mi <= 59) time = { h, mi };
  };
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, m => setTime(m[1], m[2], m[3])) ||
    take(/\sat\s(\d{1,2}):(\d{2})(?=\s)/i, m => setTime(m[1], m[2])) ||
    take(/\snoon(?=\s)/i, () => (time = { h: 12, mi: 0 }));

  const today = startOfDay(now);
  const plus = n => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const nextWeekday = target => {
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return plus(diff);
  };

  let date = null;
  let exact = null;
  let done = false;
  const attempt = (re, fn) => {
    if (!done && take(re, fn)) done = true;
  };

  if (weekday !== null) {
    date = nextWeekday(weekday);
    done = true;
  }
  attempt(/\s(today|tonight)(?=\s)/i, m => {
    date = plus(0);
    if (m[1].toLowerCase() === "tonight" && !time) time = { h: 20, mi: 0 };
  });
  attempt(/\s(?:tomorrow|tmrw|tmr)(?=\s)/i, () => (date = plus(1)));
  attempt(/\sin\s(\d{1,3})\s?(minutes?|mins?|hours?|hrs?|days?|weeks?)(?=\s)/i, m => {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith("min")) exact = new Date(now.getTime() + n * 60_000);
    else if (unit.startsWith("h")) exact = new Date(now.getTime() + n * 3_600_000);
    else if (unit.startsWith("d")) date = plus(n);
    else date = plus(n * 7);
  });
  attempt(/\snext\s+week(?=\s)/i, () => (date = plus(7)));
  attempt(new RegExp(`\\s(?:next\\s+|on\\s+|this\\s+)?(${DAY_RE})(?=\\s)`, "i"), m => {
    date = nextWeekday(DAY_INDEX[m[1].toLowerCase()]);
  });
  attempt(new RegExp(`\\s(?:on\\s+)?(${MONTH_RE})\\.?\\s+(\\d{1,2})(?=\\s)`, "i"), m => {
    const month = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3));
    const day = Number(m[2]);
    let d = new Date(now.getFullYear(), month, day);
    if (d < today) d = new Date(now.getFullYear() + 1, month, day);
    date = d;
  });

  if (exact) {
    result.dueAt = exact;
    result.allDay = false;
  } else {
    const timeOnly = !date && time;
    if (timeOnly) date = plus(0);
    if (date) {
      const d = new Date(date);
      if (time) {
        d.setHours(time.h, time.mi, 0, 0);
        if (timeOnly && d < now) d.setDate(d.getDate() + 1);
        result.allDay = false;
      } else {
        d.setHours(23, 59, 0, 0);
      }
      result.dueAt = d;
    }
  }

  result.title = s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(on|at|by|due|in|for|this|next|every)$/i, "")
    .trim()
    .slice(0, 140);

  return result;
}
