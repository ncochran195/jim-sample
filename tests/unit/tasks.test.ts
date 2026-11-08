import { describe, expect, it } from "vitest";
import { parseDueDate } from "../../src/tasks/tasks.js";

describe("due dates", () => {
  it("read an empty field as no due date", () => {
    expect(parseDueDate("")).toBeNull();
    expect(parseDueDate("  ")).toBeNull();
  });

  it("accept a real calendar day as YYYY-MM-DD", () => {
    expect(parseDueDate("2030-12-01")).toBe("2030-12-01");
    expect(parseDueDate("2028-02-29")).toBe("2028-02-29");
  });

  it("reject anything else", () => {
    for (const raw of ["2030-02-30", "2029-02-29", "2030-13-01", "01/12/2030", "tomorrow"]) {
      expect(parseDueDate(raw)).toBeUndefined();
    }
  });
});
