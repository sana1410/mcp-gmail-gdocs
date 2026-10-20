import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleAuthProvider } from "../auth/googleOAuth.js";
import { DocsService, extractDocumentId } from "../services/docs.js";
import { validateSize, validateNotEmpty } from "../guardrails/validation.js";
import type { AllowList } from "../guardrails/allowlist.js";
import type { RateLimiter } from "../guardrails/rateLimit.js";
import type { IdempotencyCache } from "../guardrails/idempotency.js";
import type { AuditLog } from "../guardrails/audit.js";
import type { Config } from "../config.js";
import { logger } from "../logger.js";

const inputSchema = {
  document_id: z.string().describe("Google Doc ID or full document URL."),
  text: z.string().describe("Text to append."),
  add_heading: z.string().optional().describe("Optional heading line inserted before the text."),
  add_timestamp: z.boolean().default(false).describe("Prefix the appended block with the current date/time."),
  separator: z.enum(["none", "blank_line", "horizontal_rule"]).default("blank_line").describe("Spacing before the appended block."),
  dry_run: z.boolean().default(false).describe("If true, return what would be appended without modifying the doc."),
  idempotency_key: z.string().optional().describe("Optional key to prevent duplicate appends on retry."),
};

export function registerGdocsAppendText(
  server: McpServer,
  auth: GoogleAuthProvider,
  config: Config,
  allowList: AllowList,
  rateLimiter: RateLimiter,
  idempotencyCache: IdempotencyCache,
  auditLog: AuditLog,
): void {
  server.tool(
    "gdocs_append_text",
    "Append text to the end of an existing Google Doc. Never deletes or overwrites existing content. Use dry_run: true to preview what will be appended.",
    inputSchema,
    async (params) => {
      try {
        const { document_id, text, add_heading, add_timestamp, separator, dry_run, idempotency_key } = params;

        validateNotEmpty(text, "Text");
        validateSize(text, config.MAX_APPEND_SIZE_BYTES, "Append text");

        let docId: string;
        try {
          docId = extractDocumentId(document_id);
        } catch (err) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: String(err) }) }],
            isError: true,
          };
        }

        const allowCheck = allowList.checkDocumentId(docId);
        if (!allowCheck.allowed) {
          auditLog.log({ tool: "gdocs_append_text", action: "append", detail: `blocked: ${allowCheck.reason}`, status: "blocked" });
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: allowCheck.reason }) }],
            isError: true,
          };
        }

        const docsService = new DocsService(auth.getClient());

        if (dry_run) {
          const preview = await docsService.preview({ document_id: docId, text, add_heading, add_timestamp, separator });
          auditLog.log({ tool: "gdocs_append_text", action: "preview", detail: `doc: ${docId}`, status: "dry_run" });
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

        const rateCheck = rateLimiter.check("gdocs_append", config.MAX_APPENDS_PER_HOUR);
        if (!rateCheck.allowed) {
          auditLog.log({ tool: "gdocs_append_text", action: "append", detail: `rate limited`, status: "blocked" });
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: rateCheck.reason }) }],
            isError: true,
          };
        }

        const result = await docsService.appendText({ document_id: docId, text, add_heading, add_timestamp, separator });

        if (idempotency_key) {
          idempotencyCache.set(idempotency_key, result);
        }

        auditLog.log({ tool: "gdocs_append_text", action: "append", detail: `doc: ${docId}, chars: ${result.characters_added}`, status: "success" });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("gdocs_append_text failed", { error: message });
        auditLog.log({ tool: "gdocs_append_text", action: "append", detail: message, status: "error" });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message, hint: "Check the document ID and permissions." }) }],
          isError: true,
        };
      }
    },
  );
}
