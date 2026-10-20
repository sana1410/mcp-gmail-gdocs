import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { GoogleAuthProvider } from "./auth/googleOAuth.js";
import { AllowList } from "./guardrails/allowlist.js";
import { RateLimiter } from "./guardrails/rateLimit.js";
import { IdempotencyCache } from "./guardrails/idempotency.js";
import { AuditLog } from "./guardrails/audit.js";
import { registerAuthStatus } from "./tools/authStatus.js";
import { registerGmailSendEmail } from "./tools/gmailSendEmail.js";
import { registerGdocsAppendText } from "./tools/gdocsAppendText.js";

export function createServer(config: Config) {
  const server = new McpServer({
    name: "mcp-gmail-gdocs",
    version: "1.0.0",
  });

  const auth = new GoogleAuthProvider(config);
  const allowList = new AllowList(
    config.ALLOWED_RECIPIENTS,
    config.ALLOWED_RECIPIENT_DOMAINS,
    config.ALLOWED_DOCUMENT_IDS,
  );
  const rateLimiter = new RateLimiter();
  const idempotencyCache = new IdempotencyCache();
  const auditLog = new AuditLog();

  registerAuthStatus(server, auth);
  registerGmailSendEmail(server, auth, config, allowList, rateLimiter, idempotencyCache, auditLog);
  registerGdocsAppendText(server, auth, config, allowList, rateLimiter, idempotencyCache, auditLog);

  return { server, auth, idempotencyCache };
}
