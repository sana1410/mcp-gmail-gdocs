import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleAuthProvider } from "../auth/googleOAuth.js";
import { GmailService } from "../services/gmail.js";
import { validateEmails, validateRecipientCount, validateSize, validateNotEmpty } from "../guardrails/validation.js";
import type { AllowList } from "../guardrails/allowlist.js";
import type { RateLimiter } from "../guardrails/rateLimit.js";
import type { IdempotencyCache } from "../guardrails/idempotency.js";
import type { AuditLog } from "../guardrails/audit.js";
import type { Config } from "../config.js";
import { logger } from "../logger.js";

const inputSchema = {
  to: z.array(z.string()).describe("Recipient email addresses."),
  subject: z.string().describe("Email subject line."),
  body: z.string().describe("Email body content."),
  body_format: z.enum(["plain", "html"]).default("plain").describe("Whether body is plain text or HTML."),
  cc: z.array(z.string()).optional().describe("CC addresses (optional)."),
  bcc: z.array(z.string()).optional().describe("BCC addresses (optional)."),
  reply_to: z.string().optional().describe("Reply-To address (optional)."),
  dry_run: z.boolean().default(true).describe("If true, validate and return a preview without sending. Set false only after the user has approved the preview."),
  idempotency_key: z.string().optional().describe("Optional key to prevent duplicate sends on retry."),
};

export function registerGmailSendEmail(
  server: McpServer,
  auth: GoogleAuthProvider,
  config: Config,
  allowList: AllowList,
  rateLimiter: RateLimiter,
  idempotencyCache: IdempotencyCache,
  auditLog: AuditLog,
): void {
  server.tool(
    "gmail_send_email",
    "Send an email from the authenticated user's Gmail account. Sends a real email when dry_run is false. IMPORTANT: Always call with dry_run: true first and show the preview to the user for approval before sending.",
    inputSchema,
    async (params) => {
      try {
        const { to, subject, body, body_format, cc, bcc, reply_to, dry_run, idempotency_key } = params;

        validateNotEmpty(subject, "Subject");
        validateNotEmpty(body, "Body");
        validateSize(body, config.MAX_BODY_SIZE_BYTES, "Email body");

        const allRecipients = [...to, ...(cc ?? []), ...(bcc ?? [])];
        const { valid, invalid } = validateEmails(allRecipients);
        if (invalid.length > 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid email addresses", invalid }) }],
            isError: true,
          };
        }

        validateRecipientCount(to, cc ?? [], bcc ?? [], config.MAX_RECIPIENTS);

        if (reply_to) {
          const replyCheck = validateEmails([reply_to]);
          if (replyCheck.invalid.length > 0) {
            return {
              content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid Reply-To address", invalid: replyCheck.invalid }) }],
              isError: true,
            };
          }
        }

        const allowCheck = allowList.checkAllRecipients(allRecipients);
        if (!allowCheck.allowed) {
          auditLog.log({ tool: "gmail_send_email", action: "send", detail: `blocked: ${allowCheck.reason}`, status: "blocked" });
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: allowCheck.reason }) }],
            isError: true,
          };
        }

        const gmailService = new GmailService(auth.getClient());

        if (dry_run) {
          const preview = await gmailService.preview({ to, subject, body, body_format, cc, bcc, reply_to });
          auditLog.log({ tool: "gmail_send_email", action: "preview", detail: `recipients: ${allRecipients.length}`, status: "dry_run" });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(preview, null, 2) }],
          };
        }

        if (idempotency_key) {
          const cached = idempotencyCache.get(idempotency_key);
          if (cached) {
            logger.debug("Returning cached result for idempotency key", { key: idempotency_key });
            return {
              content: [{ type: "text" as const, text: JSON.stringify(cached, null, 2) }],
            };
          }
        }

        const rateCheck = rateLimiter.check("gmail_send", config.MAX_EMAILS_PER_HOUR);
        if (!rateCheck.allowed) {
          auditLog.log({ tool: "gmail_send_email", action: "send", detail: `rate limited`, status: "blocked" });
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: rateCheck.reason }) }],
            isError: true,
          };
        }

        const result = await gmailService.sendEmail({ to, subject, body, body_format, cc, bcc, reply_to });

        if (idempotency_key) {
          idempotencyCache.set(idempotency_key, result);
        }

        auditLog.log({ tool: "gmail_send_email", action: "send", detail: `recipients: ${allRecipients.length}, message_id: ${result.message_id}`, status: "success" });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("gmail_send_email failed", { error: message });
        auditLog.log({ tool: "gmail_send_email", action: "send", detail: message, status: "error" });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, hint: "Check auth status and try again." }) }],
          isError: true,
        };
      }
    },
  );
}
