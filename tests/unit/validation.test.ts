import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  validateEmails,
  validateRecipientCount,
  validateSize,
  validateNotEmpty,
} from "../../src/guardrails/validation.js";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user+tag@sub.domain.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});

describe("validateEmails", () => {
  it("separates valid and invalid emails", () => {
    const result = validateEmails(["good@test.com", "bad", "ok@ok.org"]);
    expect(result.valid).toEqual(["good@test.com", "ok@ok.org"]);
    expect(result.invalid).toEqual(["bad"]);
  });

  it("trims whitespace", () => {
    const result = validateEmails(["  user@test.com  "]);
    expect(result.valid).toEqual(["user@test.com"]);
  });
});

describe("validateRecipientCount", () => {
  it("passes when under limit", () => {
    expect(() => validateRecipientCount(["a@b.com"], ["c@d.com"], [], 25)).not.toThrow();
  });

  it("throws when over limit", () => {
    const to = Array(20).fill("a@b.com");
    const cc = Array(10).fill("c@d.com");
    expect(() => validateRecipientCount(to, cc, [], 25)).toThrow("Too many recipients");
  });
});

describe("validateSize", () => {
  it("passes for small content", () => {
    expect(() => validateSize("hello", 100, "test")).not.toThrow();
  });

  it("throws for oversized content", () => {
    expect(() => validateSize("x".repeat(200), 100, "test")).toThrow("test too large");
  });
});

describe("validateNotEmpty", () => {
  it("passes for non-empty strings", () => {
    expect(() => validateNotEmpty("hello", "field")).not.toThrow();
  });

  it("throws for empty/whitespace strings", () => {
    expect(() => validateNotEmpty("", "Subject")).toThrow("Subject cannot be empty");
    expect(() => validateNotEmpty("   ", "Subject")).toThrow("Subject cannot be empty");
  });
});
