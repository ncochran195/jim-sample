import { describe, expect, it } from "vitest";
import { isOverdue, parseDueDate, todayUtc } from "../../src/tasks/tasks.js";

describe("parseDueDate", () => {
  it("treats an empty value as no due date", () => {
    expect(parseDueDate("")).toBeNull();
    expect(parseDueDate(undefined)).toBeNull();
  });

  it("keeps a real calendar date, past or future", () => {
    expect(parseDueDate("2099-03-01")).toBe("2099-03-01");
    expect(parseDueDate("2020-01-15")).toBe("2020-01-15");
    expect(parseDueDate("2028-02-29")).toBe("2028-02-29");
  });

  it("refuses anything that isn't a real YYYY-MM-DD date", () => {
    for (const bad of [
      "2026-02-30",
      "2027-02-29",
      "2026-13-01",
      "2026-1-5",
      "tomorrow",
      "2026-01-01T00:00",
    ]) {
      expect(parseDueDate(bad)).toBeUndefined();
    }
  });
});

describe("isOverdue", () => {
  const today = "2026-11-03";
  it("marks open tasks due before today", () => {
    expect(isOverdue({ done: false, due_date: "2026-11-02" }, today)).toBe(true);
  });
  it("doesn't mark tasks due today or later, undated or done", () => {
    expect(isOverdue({ done: false, due_date: today }, today)).toBe(false);
    expect(isOverdue({ done: false, due_date: "2099-01-01" }, today)).toBe(false);
    expect(isOverdue({ done: false, due_date: null }, today)).toBe(false);
    expect(isOverdue({ done: true, due_date: "2020-01-15" }, today)).toBe(false);
  });
});

describe("todayUtc", () => {
  it("gives the UTC date", () => {
    expect(todayUtc(new Date("2026-11-03T23:30:00-05:00"))).toBe("2026-11-04");
  });
});
