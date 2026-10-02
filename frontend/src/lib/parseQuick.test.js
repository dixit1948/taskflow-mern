import { describe, expect, it } from "vitest";
import { parseQuick } from "./parseQuick";

// Wednesday 30 Sep 2026, 10:00 local
const now = new Date(2026, 8, 30, 10, 0, 0);
const parse = text => parseQuick(text, now);

describe("parseQuick", () => {
  it("leaves plain titles alone", () => {
    const r = parse("Buy milk");
    expect(r).toMatchObject({ title: "Buy milk", priority: "None", repeat: "none", dueAt: null, allDay: true });
  });

  it("extracts date, time, priority and labels", () => {
    const r = parse("Pay rent tomorrow 5pm !high #bills");
    expect(r.title).toBe("Pay rent");
    expect(r.priority).toBe("High");
    expect(r.labels).toEqual(["bills"]);
    expect(r.allDay).toBe(false);
    expect(r.dueAt.getDate()).toBe(1);
    expect(r.dueAt.getHours()).toBe(17);
  });

  it("handles weekdays and repeats", () => {
    const r = parse("Team sync every monday at 10:30am");
    expect(r.repeat).toBe("weekly");
    expect(r.dueAt.getDay()).toBe(1);
    expect([r.dueAt.getHours(), r.dueAt.getMinutes()]).toEqual([10, 30]);
  });

  it("handles relative times", () => {
    const r = parse("Call mom in 2 hours");
    expect(r.title).toBe("Call mom");
    expect(r.dueAt.getTime() - now.getTime()).toBe(2 * 3600_000);
  });

  it("handles explicit dates as all-day", () => {
    const r = parse("Submit report on Oct 5");
    expect(r.allDay).toBe(true);
    expect([r.dueAt.getMonth(), r.dueAt.getDate()]).toEqual([9, 5]);
  });

  it("does not eat words that merely look like dates", () => {
    expect(parse("review marketing 5 slides").title).toBe("review marketing 5 slides");
    expect(parse("Plan the month ahead").dueAt).toBeNull();
  });

  it("rolls a past time-only entry to tomorrow", () => {
    const r = parse("Stretch at 9am");
    expect(r.dueAt.getDate()).toBe(1);
  });

  it("dedupes labels and caps title length", () => {
    expect(parse("x #a #A #a").labels).toEqual(["a"]);
    expect(parse("y".repeat(300)).title.length).toBe(140);
  });
});
