import { describe, it, expect } from "vitest";
import { RateLimiter } from "../../src/guardrails/rateLimit.js";

describe("RateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("test", 5).allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) {
      limiter.check("test", 3);
    }
    const result = limiter.check("test", 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Rate limit exceeded");
  });

  it("tracks different keys separately", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) {
      limiter.check("key1", 3);
    }
    expect(limiter.check("key1", 3).allowed).toBe(false);
    expect(limiter.check("key2", 3).allowed).toBe(true);
  });

  it("resets a specific key", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) {
      limiter.check("test", 3);
    }
    expect(limiter.check("test", 3).allowed).toBe(false);
    limiter.reset("test");
    expect(limiter.check("test", 3).allowed).toBe(true);
  });
});
