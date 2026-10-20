import { describe, it, expect } from "vitest";
import { AllowList } from "../../src/guardrails/allowlist.js";

describe("AllowList", () => {
  describe("recipients", () => {
    it("allows all when no allow-list configured", () => {
      const list = new AllowList();
      expect(list.checkRecipient("anyone@anywhere.com").allowed).toBe(true);
    });

    it("allows by exact address", () => {
      const list = new AllowList("alice@test.com,bob@test.com");
      expect(list.checkRecipient("alice@test.com").allowed).toBe(true);
      expect(list.checkRecipient("Bob@Test.com").allowed).toBe(true);
      expect(list.checkRecipient("evil@hacker.com").allowed).toBe(false);
    });

    it("allows by domain", () => {
      const list = new AllowList(undefined, "example.com");
      expect(list.checkRecipient("anyone@example.com").allowed).toBe(true);
      expect(list.checkRecipient("user@other.com").allowed).toBe(false);
    });

    it("checks all recipients", () => {
      const list = new AllowList(undefined, "ok.com");
      const result = list.checkAllRecipients(["a@ok.com", "b@notok.com"]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("b@notok.com");
    });
  });

  describe("documents", () => {
    it("allows all when no allow-list configured", () => {
      const list = new AllowList();
      expect(list.checkDocumentId("any-doc-id").allowed).toBe(true);
    });

    it("allows listed document IDs", () => {
      const list = new AllowList(undefined, undefined, "doc1,doc2");
      expect(list.checkDocumentId("doc1").allowed).toBe(true);
      expect(list.checkDocumentId("doc3").allowed).toBe(false);
    });
  });
});
