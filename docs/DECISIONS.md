# Architecture Decisions

## D1: TypeScript over Python

**Decision:** TypeScript with the official `@modelcontextprotocol/sdk`.

**Rationale:** The problem statement prefers TypeScript for easy `npx` distribution. The MCP TypeScript SDK is mature and supports both stdio and Streamable HTTP transports.

## D2: JSON file-based idempotency cache over SQLite

**Decision:** Use a JSON file for the idempotency cache instead of SQLite.

**Rationale:** `better-sqlite3` requires native compilation (Python + node-gyp), which creates installation friction on Windows and in CI environments. A JSON file-based cache is zero-dependency, works on all platforms, and is sufficient for the expected volume (individual user, <100 operations/day). The 24-hour TTL keeps the file small.

**Trade-off:** Not suitable for high-concurrency multi-process scenarios. Acceptable for a single-user MCP server.

## D3: Flat tool schemas only

**Decision:** All tool input schemas use flat `type: object` with simple properties only. No `$ref`, `oneOf`, `anyOf`, `allOf`, or nested objects.

**Rationale:** Different AI clients parse JSON Schema with varying strictness. Flat schemas are the lowest common denominator that works across Claude, ChatGPT, Gemini, and Cursor.

## D4: `documents` scope instead of `drive.file`

**Decision:** Request the `https://www.googleapis.com/auth/documents` scope.

**Rationale:** `drive.file` only covers files the app created or the user explicitly opened through the app. Since the use case requires appending to arbitrary pre-existing docs by ID, the `documents` scope is necessary. This is broader than ideal — a future enhancement could add Google Picker integration to enable `drive.file`-only access.

## D5: Dry-run defaults

**Decision:** `gmail_send_email` defaults `dry_run` to `true`; `gdocs_append_text` defaults `dry_run` to `false`.

**Rationale:** Email sending is irreversible and high-risk (prompt injection could cause unwanted sends). Appending to a doc is lower risk (append-only, content preserved). The asymmetric defaults match the risk profile while keeping the doc tool ergonomic for repeated appends.

## D6: Stateless HTTP transport

**Decision:** The Streamable HTTP server is stateless — no in-memory session state. Tokens and idempotency data live in the file system.

**Rationale:** Enables running behind a load balancer or on serverless platforms. The MCP `2026-07-28` spec encourages stateless HTTP servers.

## D7: No deprecated MCP features

**Decision:** The server does not use Roots, Sampling, Logging notifications, HTTP+SSE transport, or `includeContext` with `thisServer`/`allServers`.

**Rationale:** These are deprecated in the `2026-07-28` MCP specification. Confirmation is handled entirely through the `dry_run` tool parameter, which works identically across all clients.

## D8: Express for HTTP transport

**Decision:** Use Express.js for the HTTP server layer.

**Rationale:** Express is the most widely used Node.js HTTP framework, well-tested, and the MCP SDK's `StreamableHTTPServerTransport` integrates directly with Express request/response objects.
