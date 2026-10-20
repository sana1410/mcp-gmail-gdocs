# Deployment Plan: MCP Gmail + Google Docs Server

## Overview

This document covers deploying the MCP server as a remote Streamable HTTP endpoint so that cloud-based AI clients (ChatGPT connectors, Claude.ai, etc.) can reach it. Two platforms are covered: **Railway** (recommended) and **Vercel**.

**TL;DR:** Railway is the better fit — it runs a long-lived Node.js process, which is what the MCP Streamable HTTP transport expects. Vercel's serverless model requires architectural changes.

---

## Option A: Railway (Recommended)

Railway runs persistent containers, which is a natural fit for the MCP HTTP server.

### Prerequisites

- A [Railway](https://railway.app) account
- Railway CLI installed: `npm i -g @railway/cli`
- The project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

### Step 1: Create a Railway project

```bash
cd mcp-gmail-gdocs
railway login
railway init
```

Select "Empty Project" when prompted.

### Step 2: Set environment variables

```bash
railway variables set GOOGLE_CLIENT_ID="1056295023051-sbmrrnloff47u76cef8bv236o64sf7ar.apps.googleusercontent.com"
railway variables set GOOGLE_CLIENT_SECRET="<your-client-secret>"
railway variables set GOOGLE_REDIRECT_URI="https://<your-railway-domain>/oauth2callback"
railway variables set MCP_TRANSPORT="http"
railway variables set HTTP_HOST="0.0.0.0"
railway variables set HTTP_PORT="3000"
railway variables set PUBLIC_BASE_URL="https://<your-railway-domain>"
railway variables set ALLOWED_ORIGINS="https://<your-railway-domain>,https://claude.ai,https://chatgpt.com"
railway variables set LOG_LEVEL="info"
railway variables set NODE_ENV="production"
```

> **Important:** Replace `<your-railway-domain>` with the domain Railway assigns (e.g., `mcp-gmail-gdocs-production.up.railway.app`). You'll see it after the first deploy.

### Step 3: Configure the build

Create `railway.toml` in the project root:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/healthz"
healthcheckTimeout = 10
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Alternatively, Railway auto-detects the Dockerfile. To use it:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/healthz"
healthcheckTimeout = 10
```

### Step 4: Deploy

```bash
railway up
```

Or connect your GitHub repo in the Railway dashboard for automatic deploys on push.

### Step 5: Get your public URL

```bash
railway domain
```

Railway assigns a URL like `mcp-gmail-gdocs-production.up.railway.app`. Now go back and update:

1. `PUBLIC_BASE_URL` and `ALLOWED_ORIGINS` env vars with the real domain
2. Google Cloud Console → OAuth client → add the Railway URL to authorized redirect URIs

### Step 6: Authorize (one-time)

Since the server is remote, you need to run the OAuth flow once. Options:

**Option A — Local auth, upload tokens:**
```bash
# Run locally to get tokens
npm run auth

# Upload the token file as a Railway volume or base64 env var
railway variables set GOOGLE_TOKENS_BASE64="$(base64 -w0 ~/.config/mcp-gmail-gdocs/tokens.json)"
```

Then modify `tokenStore.ts` to read from `GOOGLE_TOKENS_BASE64` env var if present (for remote deployments).

**Option B — SSH into the Railway container:**
```bash
railway shell
node dist/auth/cli.js
```

### Step 7: Verify

```bash
curl https://mcp-gmail-gdocs-production.up.railway.app/healthz
# {"status":"ok","timestamp":"..."}
```

### Step 8: Connect AI clients

ChatGPT / Claude.ai remote connector:
```json
{
  "mcpServers": {
    "gmail-gdocs": {
      "url": "https://mcp-gmail-gdocs-production.up.railway.app/mcp"
    }
  }
}
```

### Railway costs

- **Trial plan:** 500 hours free, then $5/month for Hobby
- **Resource usage:** This server is lightweight (~50MB RAM, near-zero CPU when idle)
- **Estimated cost:** $1–3/month on Hobby plan

---

## Option B: Vercel

Vercel is a serverless platform. The MCP server uses long-lived HTTP connections and in-memory session state, which **does not fit Vercel's model directly**. However, it can work with modifications.

### Limitations on Vercel

| Concern | Impact |
|---------|--------|
| **Serverless function timeout** | 10s (Hobby) / 60s (Pro). MCP sessions that involve streaming or long tool calls may time out. |
| **No persistent process** | Each request is a cold start. Session state (MCP session IDs) is lost between invocations. |
| **No WebSocket/SSE persistence** | Vercel Serverless Functions don't maintain long-lived connections for SSE streaming. |

### Architecture changes needed for Vercel

To make the MCP server work on Vercel, you would need to:

1. **Use fully stateless mode** — no session IDs, each request is self-contained
2. **Move token storage to an external store** — e.g., Vercel KV (Redis), Upstash, or encrypted env vars
3. **Move idempotency cache to an external store** — Vercel KV or Upstash Redis
4. **Wrap the server in a Vercel serverless function**

### Step 1: Create `api/mcp.ts`

```typescript
import { createServer } from "../src/server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET" && req.url === "/healthz") {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  }

  const config = loadConfig();
  const { server } = createServer(config);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
```

### Step 2: Configure `vercel.json`

```json
{
  "version": 2,
  "builds": [
    { "src": "api/mcp.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/mcp", "dest": "/api/mcp" },
    { "src": "/healthz", "dest": "/api/mcp" }
  ]
}
```

### Step 3: Set environment variables

In the Vercel dashboard → Project Settings → Environment Variables:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_TOKENS_BASE64=<base64-encoded tokens.json>
MCP_TRANSPORT=http
ALLOWED_ORIGINS=https://your-project.vercel.app,https://claude.ai,https://chatgpt.com
```

### Step 4: Deploy

```bash
npm i -g vercel
vercel
```

### Step 5: Verify

```bash
curl https://your-project.vercel.app/healthz
```

### Vercel costs

- **Hobby:** Free (100GB bandwidth, 100 hours serverless)
- **Pro:** $20/month (more bandwidth, longer timeouts)

---

## Comparison

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Architecture fit** | Excellent — persistent process | Poor — requires stateless refactor |
| **Setup difficulty** | Easy — deploy as-is | Moderate — needs code changes |
| **MCP session support** | Full — sessions maintained | Limited — stateless only |
| **SSE streaming** | Works natively | Not supported in serverless |
| **Cold starts** | None — always running | Yes — 200–500ms per request |
| **Cost** | ~$5/month (Hobby) | Free tier available |
| **Custom domain** | Yes | Yes |
| **HTTPS** | Automatic | Automatic |
| **Auto-deploy from Git** | Yes | Yes |

### Recommendation

**Use Railway** unless you have a specific reason to use Vercel. The MCP server is designed as a persistent HTTP server, which maps directly to Railway's model without code changes.

---

## Post-Deployment Checklist

- [ ] Server responds to `/healthz`
- [ ] HTTPS is active (both platforms provide this automatically)
- [ ] Google OAuth redirect URI updated in Google Cloud Console
- [ ] `ALLOWED_ORIGINS` includes the AI client domains that will connect
- [ ] Tokens are authorized and accessible to the deployed server
- [ ] Test `auth_status` tool call via the MCP endpoint
- [ ] Test `gmail_send_email` with `dry_run: true`
- [ ] Test `gdocs_append_text` with `dry_run: true`
- [ ] Set `LOG_LEVEL=warn` in production to reduce noise
- [ ] Configure `ALLOWED_RECIPIENTS` / `ALLOWED_RECIPIENT_DOMAINS` for safety

---

## Token Management in Production

Google OAuth tokens expire and need refreshing. In production:

1. **Refresh tokens are long-lived** (if the app is published or Internal type)
2. **Access tokens auto-refresh** via the refresh token — the server handles this
3. **For External/Testing apps:** refresh tokens expire after 7 days — you'll need to re-authorize periodically (see `docs/GOOGLE_CLOUD_SETUP.md`)

For a production deployment, store tokens in:
- Railway: a persistent volume or encrypted env var (updated on refresh via the `tokens` event handler)
- Vercel: Vercel KV or an encrypted env var

The current file-based token store works out of the box on Railway (persistent filesystem). For Vercel, you'll need the env-var approach described above.
