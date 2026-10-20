import { describe, it, expect, afterEach } from "vitest";
import { IdempotencyCache } from "../../src/guardrails/idempotency.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

describe("IdempotencyCache", () => {
  const testPath = path.join(os.tmpdir(), `idempotency-test-${Date.now()}.json`);
  let cache: IdempotencyCache;

  afterEach(() => {
    cache?.close();
    try { fs.unlinkSync(testPath); } catch {}
  });

  it("returns null for unknown keys", () => {
    cache = new IdempotencyCache(testPath);
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves results", () => {
    cache = new IdempotencyCache(testPath);
    const result = { status: "sent", message_id: "123" };
    cache.set("key1", result);
    expect(cache.get("key1")).toEqual(result);
  });

  it("overwrites existing keys", () => {
    cache = new IdempotencyCache(testPath);
    cache.set("key1", { v: 1 });
    cache.set("key1", { v: 2 });
    expect(cache.get("key1")).toEqual({ v: 2 });
  });

  it("persists across instances", () => {
    cache = new IdempotencyCache(testPath);
    cache.set("persist-key", { data: "hello" });
    cache.close();

    const cache2 = new IdempotencyCache(testPath);
    expect(cache2.get("persist-key")).toEqual({ data: "hello" });
    cache2.close();
  });
});
