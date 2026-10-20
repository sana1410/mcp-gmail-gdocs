# mcp-gmail-gdocs

A generic **MCP (Model Context Protocol) server** that gives any AI assistant two capabilities:

1. **Send emails through Gmail** (on behalf of the authenticated user)
2. **Append content to an existing Google Doc**

Works with **Claude**, **ChatGPT**, **Gemini**, **Cursor**, and any MCP-compatible client — no code changes needed.

## Quick Start (< 15 minutes)

### 1. Set up Google Cloud credentials

Follow [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md) to create a Google Cloud project with Gmail and Docs APIs enabled, and get your OAuth client ID and secret.

### 2. Install and build

```bash
git clone <this-repo>
cd mcp-gmail-gdocs
npm install
npm run build
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
```

### 4. Authorize your Google account

```bash
npm run auth
```

This opens a browser for Google consent. After approving, tokens are saved locally.

### 5. Connect to your AI client

See [docs/CLIENT_SETUP.md](docs/CLIENT_SETUP.md) for detailed instructions per client.

**Cursor / Claude Desktop (stdio):**

```json
{
  "mcpServers": {
    "gmail-gdocs": {
      "command": "node",
      "args": ["/path/to/mcp-gmail-gdocs/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>"
      }
    }
  }
}
```

### 6. Try it

Ask your AI assistant:
- "Check my Gmail auth status"
- "Email alice@example.com that the meeting is moved to Friday 5 PM" (previews first, then sends on approval)
- "Append today's meeting notes to my Minutes doc"

## Tools

### `auth_status`

Check whether Google authorization is valid, which account is connected, and which scopes were granted.

### `gmail_send_email`

Send an email from the authenticated user's Gmail account.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `to` | string[] | yes | — | Recipient email addresses |
| `subject` | string | yes | — | Email subject line |
| `body` | string | yes | — | Email body content |
| `body_format` | "plain" \| "html" | no | "plain" | Body content type |
| `cc` | string[] | no | — | CC addresses |
| `bcc` | string[] | no | — | BCC addresses |
| `reply_to` | string | no | — | Reply-To address |
| `dry_run` | boolean | no | **true** | Preview without sending |
| `idempotency_key` | string | no | — | Prevent duplicate sends |

**Safety:** `dry_run` defaults to `true`. The AI will preview the email first and only send after user approval.

### `gdocs_append_text`

Append text to the end of an existing Google Doc. Never deletes or overwrites.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `document_id` | string | yes | — | Doc ID or full URL |
| `text` | string | yes | — | Text to append |
| `add_heading` | string | no | — | Heading before text |
| `add_timestamp` | boolean | no | false | Prefix with date/time |
| `separator` | "none" \| "blank_line" \| "horizontal_rule" | no | "blank_line" | Spacing before block |
| `dry_run` | boolean | no | false | Preview without modifying |
| `idempotency_key` | string | no | — | Prevent duplicate appends |

## Transport Modes

| Mode | Command | Use case |
|------|---------|----------|
| **stdio** (default) | `node dist/index.js` | Cursor, Claude Desktop, Gemini CLI |
| **HTTP** | `MCP_TRANSPORT=http node dist/index.js` | ChatGPT, Claude.ai, remote clients |

## Safety Features

- **Dry-run by default** for email (preview before sending)
- **Recipient allow-list** (`ALLOWED_RECIPIENTS`, `ALLOWED_RECIPIENT_DOMAINS`)
- **Document allow-list** (`ALLOWED_DOCUMENT_IDS`)
- **Rate limiting** (configurable per-hour caps)
- **Size limits** on email body and doc appends
- **Append-only** doc operations (never deletes/overwrites)
- **Audit log** (timestamps, tool names, status — no message content)
- **Header injection protection** (CR/LF stripping)
- **Idempotency keys** to prevent duplicate operations on retry

## Configuration

All configuration via environment variables. See [.env.example](.env.example) for the full list.

## Development

```bash
npm install
npm run build       # compile TypeScript
npm run dev         # watch mode
npm test            # run tests
npm run typecheck   # type checking only
```

## Architecture

```
AI Clients (Claude, ChatGPT, Gemini, Cursor)
    │ stdio or Streamable HTTP
    ▼
Transport Layer (SDK-provided)
    │
MCP Server Core (tool registry)
    ├── gmail_send_email
    ├── gdocs_append_text
    └── auth_status
    │
Cross-cutting (validation, guardrails, rate limits, idempotency, audit)
    │
Services (GmailService, DocsService, GoogleAuthProvider)
    │
Google Gmail API / Google Docs API
```

## License

MIT
