import { describe, it, expect } from "vitest";
import { sanitizeHeader, buildMimeMessage } from "../../src/services/gmail.js";

describe("sanitizeHeader", () => {
  it("strips CR and LF characters", () => {
    expect(sanitizeHeader("test\r\ninjection")).toBe("testinjection");
    expect(sanitizeHeader("normal")).toBe("normal");
    expect(sanitizeHeader("line\rone\ntwo")).toBe("lineonetwo");
  });
});

describe("buildMimeMessage", () => {
  it("builds a valid plain text MIME message", () => {
    const mime = buildMimeMessage("sender@test.com", {
      to: ["recipient@test.com"],
      subject: "Test Subject",
      body: "Hello world",
      body_format: "plain",
    });

    expect(mime).toContain("From: sender@test.com");
    expect(mime).toContain("To: recipient@test.com");
    expect(mime).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(mime).toContain("MIME-Version: 1.0");
  });

  it("builds an HTML MIME message", () => {
    const mime = buildMimeMessage("sender@test.com", {
      to: ["r@t.com"],
      subject: "HTML",
      body: "<h1>Hello</h1>",
      body_format: "html",
    });
    expect(mime).toContain("Content-Type: text/html; charset=UTF-8");
  });

  it("encodes UTF-8 subjects as base64", () => {
    const mime = buildMimeMessage("s@t.com", {
      to: ["r@t.com"],
      subject: "Héllo Wörld",
      body: "test",
      body_format: "plain",
    });
    expect(mime).toContain("=?UTF-8?B?");
    const match = mime.match(/=\?UTF-8\?B\?(.+?)\?=/);
    expect(match).toBeTruthy();
    const decoded = Buffer.from(match![1], "base64").toString("utf-8");
    expect(decoded).toBe("Héllo Wörld");
  });

  it("includes CC when provided", () => {
    const mime = buildMimeMessage("s@t.com", {
      to: ["r@t.com"],
      subject: "Test",
      body: "body",
      body_format: "plain",
      cc: ["cc@t.com"],
    });
    expect(mime).toContain("Cc: cc@t.com");
  });

  it("includes Reply-To when provided", () => {
    const mime = buildMimeMessage("s@t.com", {
      to: ["r@t.com"],
      subject: "Test",
      body: "body",
      body_format: "plain",
      reply_to: "reply@t.com",
    });
    expect(mime).toContain("Reply-To: reply@t.com");
  });

  it("sanitizes headers against injection", () => {
    const mime = buildMimeMessage("s@t.com", {
      to: ["r@t.com\r\nBcc: evil@hacker.com"],
      subject: "Test",
      body: "body",
      body_format: "plain",
    });
    // CR/LF stripped, so the injection cannot create a separate Bcc header line
    expect(mime).not.toContain("\r\nBcc:");
    expect(mime).toContain("To: r@t.comBcc: evil@hacker.com");
  });
});
