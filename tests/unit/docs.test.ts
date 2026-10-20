import { describe, it, expect } from "vitest";
import { extractDocumentId, buildAppendText } from "../../src/services/docs.js";

describe("extractDocumentId", () => {
  it("extracts ID from standard URL", () => {
    expect(
      extractDocumentId("https://docs.google.com/document/d/abc123_-XYZ/edit"),
    ).toBe("abc123_-XYZ");
  });

  it("extracts ID from URL with query params", () => {
    expect(
      extractDocumentId("https://docs.google.com/document/d/abc123/edit?usp=sharing"),
    ).toBe("abc123");
  });

  it("extracts ID from open URL", () => {
    expect(
      extractDocumentId("https://docs.google.com/open?id=def456"),
    ).toBe("def456");
  });

  it("accepts raw document ID", () => {
    expect(extractDocumentId("abcdefghijklmnopqrst")).toBe("abcdefghijklmnopqrst");
  });

  it("throws for invalid input", () => {
    expect(() => extractDocumentId("short")).toThrow("Invalid document ID");
    expect(() => extractDocumentId("")).toThrow("Invalid document ID");
  });
});

describe("buildAppendText", () => {
  it("adds blank_line separator by default", () => {
    const result = buildAppendText({
      document_id: "test",
      text: "Hello",
      separator: "blank_line",
    });
    expect(result).toBe("\nHello\n");
  });

  it("adds horizontal rule separator", () => {
    const result = buildAppendText({
      document_id: "test",
      text: "Hello",
      separator: "horizontal_rule",
    });
    expect(result).toContain("────");
    expect(result).toContain("Hello");
  });

  it("adds no separator when none", () => {
    const result = buildAppendText({
      document_id: "test",
      text: "Hello",
      separator: "none",
    });
    expect(result).toBe("Hello\n");
  });

  it("adds heading when provided", () => {
    const result = buildAppendText({
      document_id: "test",
      text: "Content",
      add_heading: "Section Title",
    });
    expect(result).toContain("Section Title\n");
    expect(result).toContain("Content");
  });

  it("adds timestamp when requested", () => {
    const result = buildAppendText({
      document_id: "test",
      text: "Entry",
      add_timestamp: true,
    });
    expect(result).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });
});
