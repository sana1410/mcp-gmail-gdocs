# Client Setup Guide

Instructions for connecting the MCP server to various AI clients.

## Prerequisites

1. Complete [Google Cloud Setup](./GOOGLE_CLOUD_SETUP.md)
2. Run `npm run auth` to authorize your Google account
3. Build the project: `npm run build`

---

## Cursor

Add to your project's `.cursor/mcp.json` or global MCP config:

```json
{
  "mcpServers": {
    "gmail-gdocs": {
      "command": "node",
      "args": ["C:/path/to/mcp-gmail-gdocs/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Or, if published to npm:

```json
{
  "mcpServers": {
    "gmail-gdocs": {
      "command": "npx",
      "args": ["-y", "mcp-gmail-gdocs"],
      "env": {
        "GOOGLE_CLIENT_ID": "<your-client-id>",
        "GOOGLE_CLIENT_SECRET": "<your-client-secret>"
      }
    }
  }
}
```

---

## Claude Desktop

Add to `claude_desktop_config.json` (found in your Claude Desktop settings):

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

---

## Claude Code

### stdio mode

```bash
claude mcp add gmail-gdocs node /path/to/mcp-gmail-gdocs/dist/index.js \
  -e GOOGLE_CLIENT_ID=<your-client-id> \
  -e GOOGLE_CLIENT_SECRET=<your-client-secret>
```

### HTTP mode

Start the server:

```bash
MCP_TRANSPORT=http HTTP_PORT=3000 node dist/index.js
```

Then:

```bash
claude mcp add gmail-gdocs --transport http http://localhost:3000/mcp
```

---

## Gemini CLI / Antigravity

Add to your MCP configuration (typically `~/.gemini/mcp.json` or project-level):

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

---

## ChatGPT (Remote Connector)

ChatGPT requires a remote Streamable HTTP endpoint over HTTPS.

1. Deploy the server with `MCP_TRANSPORT=http` and HTTPS (see [Deployment](#deployment))
2. In ChatGPT settings, add a custom MCP connector pointing to:
   ```
   https://your-domain.example.com/mcp
   ```
3. Complete the OAuth consent flow when prompted

---

## Remote (Streamable HTTP) Mode

For any client that supports remote MCP connections:

```json
{
  "mcpServers": {
    "gmail-gdocs": {
      "url": "https://your-domain.example.com/mcp"
    }
  }
}
```

### Deployment

For remote access, you need HTTPS. Options:

1. **ngrok** (development): `ngrok http 3000`
2. **Cloud Run / Fly.io / Railway** (production): Deploy the Docker container
3. **Reverse proxy** (self-hosted): nginx/caddy in front of the HTTP server

Start the server:

```bash
MCP_TRANSPORT=http \
HTTP_HOST=0.0.0.0 \
HTTP_PORT=3000 \
ALLOWED_ORIGINS=https://your-domain.example.com \
node dist/index.js
```

---

## Verifying the Connection

After connecting, ask your AI assistant:

> "Check the Gmail/Docs auth status"

It should call the `auth_status` tool and return your connected Google account email and scopes.

---

**Note:** Client UIs and MCP support change frequently. These instructions were verified as of October 2026. Check each client's current documentation if something doesn't work.
