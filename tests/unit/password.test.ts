import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/auth/password.js";
import { normaliseEmail } from "../../src/auth/users.js";
import { strictSsl } from "../../src/db/db.js";

describe("passwords", () => {
  it("verify against their own hash only", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong horse", hash)).toBe(false);
  });

  it("get a fresh salt each time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("reject a hash in an unknown format", async () => {
    expect(await verifyPassword("anything", "md5$abc")).toBe(false);
  });
});

describe("emails", () => {
  it("are trimmed and lower-cased", () => {
    expect(normaliseEmail("  Ann@Example.COM ")).toBe("ann@example.com");
  });
});

describe("database URLs", () => {
  it("ask for full certificate verification", () => {
    expect(strictSsl("postgresql://u:p@host/db?sslmode=require&channel_binding=require")).toBe(
      "postgresql://u:p@host/db?sslmode=verify-full&channel_binding=require",
    );
    expect(strictSsl("postgresql://u:p@host/db")).toBe("postgresql://u:p@host/db");
  });
});
