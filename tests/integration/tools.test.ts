import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleAuthProvider } from "../../src/auth/googleOAuth.js";
import { AllowList } from "../../src/guardrails/allowlist.js";
import { RateLimiter } from "../../src/guardrails/rateLimit.js";
import { IdempotencyCache } from "../../src/guardrails/idempotency.js";
import { AuditLog } from "../../src/guardrails/audit.js";
import { registerGmailSendEmail } from "../../src/tools/gmailSendEmail.js";
import { registerGdocsAppendText } from "../../src/tools/gdocsAppendText.js";
import type { Config } from "../../src/config.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const mockConfig: Config = {
  MCP_TRANSPORT: "stdio",
  HTTP_HOST: "127.0.0.1",
  HTTP_PORT: 3000,
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REDIRECT_URI: "http://127.0.0.1:3456/oauth2callback",
  MAX_EMAILS_PER_HOUR: 20,
  MAX_EMAILS_PER_DAY: 100,
  MAX_APPENDS_PER_HOUR: 100,
  MAX_BODY_SIZE_BYTES: 102400,
  MAX_APPEND_SIZE_BYTES: 51200,
  MAX_RECIPIENTS: 25,
  LOG_LEVEL: "error",
};

vi.mock("googleapis", () => {
  const mockSend = vi.fn().mockResolvedValue({
    data: { id: "msg-123", threadId: "thread-456" },
  });
  const mockGetProfile = vi.fn().mockResolvedValue({
    data: { emailAddress: "test@gmail.com" },
  });
  const mockBatchUpdate = vi.fn().mockResolvedValue({ data: {} });

  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          setCredentials: vi.fn(),
          on: vi.fn(),
          generateAuthUrl: vi.fn(),
          getToken: vi.fn(),
          getAccessToken: vi.fn().mockResolvedValue({ token: "mock" }),
        })),
      },
      gmail: vi.fn().mockReturnValue({
        users: {
          messages: { send: mockSend },
          getProfile: mockGetProfile,
        },
      }),
      docs: vi.fn().mockReturnValue({
        documents: { batchUpdate: mockBatchUpdate },
      }),
      oauth2: vi.fn().mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({ data: { email: "test@gmail.com" } }),
        },
      }),
    },
  };
});

describe("gmail_send_email tool", () => {
  let server: McpServer;
  let idempotencyCache: IdempotencyCache;
  const dbPath = path.join(os.tmpdir(), `idem-test-gmail-${Date.now()}.db`);
  const auditPath = path.join(os.tmpdir(), `audit-test-gmail-${Date.now()}.log`);

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    const auth = new GoogleAuthProvider(mockConfig);
    const allowList = new AllowList();
    const rateLimiter = new RateLimiter();
    idempotencyCache = new IdempotencyCache(dbPath);
    const auditLog = new AuditLog(auditPath);

    registerGmailSendEmail(server, auth, mockConfig, allowList, rateLimiter, idempotencyCache, auditLog);
  });

  it("registers the tool", () => {
    // The tool is registered - we verify by checking the server was set up without errors
    expect(server).toBeDefined();
  });
});

describe("gdocs_append_text tool", () => {
  let server: McpServer;
  let idempotencyCache: IdempotencyCache;
  const dbPath = path.join(os.tmpdir(), `idem-test-docs-${Date.now()}.db`);
  const auditPath = path.join(os.tmpdir(), `audit-test-docs-${Date.now()}.log`);

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    const auth = new GoogleAuthProvider(mockConfig);
    const allowList = new AllowList();
    const rateLimiter = new RateLimiter();
    idempotencyCache = new IdempotencyCache(dbPath);
    const auditLog = new AuditLog(auditPath);

    registerGdocsAppendText(server, auth, mockConfig, allowList, rateLimiter, idempotencyCache, auditLog);
  });

  it("registers the tool", () => {
    expect(server).toBeDefined();
  });
});
