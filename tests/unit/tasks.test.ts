import { describe, expect, it } from "vitest";
import { isOverdue, parseDue, todayUtc } from "../../src/tasks/tasks.js";

describe("parseDue", () => {
  it("reads an empty value as no due date", () => {
    expect(parseDue("")).toBeNull();
  });

  it("accepts real calendar dates", () => {
    for (const date of ["2099-03-15", "2024-02-29", "2000-02-29", "0001-01-01", "2026-12-31"]) {
      expect(parseDue(date)).toBe(date);
    }
  });

  it("refuses anything else", () => {
    for (const value of [
      "soon",
      "2026-02-30",
      "1900-02-29",
      "2026-13-01",
      "2026-00-10",
      "2026-1-5",
      "0000-01-01",
      "2026-04-31",
    ]) {
      expect(parseDue(value)).toBeUndefined();
    }
  });
});

describe("isOverdue", () => {
  const today = todayUtc(new Date("2026-11-03T12:00:00Z"));

  it("takes today in UTC", () => {
    expect(today).toBe("2026-11-03");
  });

  it("marks open tasks due before today only", () => {
    expect(isOverdue({ done: false, due_date: "2026-11-02" }, today)).toBe(true);
    expect(isOverdue({ done: false, due_date: "2026-11-03" }, today)).toBe(false);
    expect(isOverdue({ done: false, due_date: "2026-11-04" }, today)).toBe(false);
    expect(isOverdue({ done: false, due_date: null }, today)).toBe(false);
  });

  it("never marks done tasks", () => {
    expect(isOverdue({ done: true, due_date: "2020-01-15" }, today)).toBe(false);
  });
});
