#!/usr/bin/env node
import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import { loadConfig } from "../config.js";
import { GoogleAuthProvider } from "./googleOAuth.js";
import { setLogLevel } from "../logger.js";

async function main() {
  const config = loadConfig();
  setLogLevel(config.LOG_LEVEL);
  const auth = new GoogleAuthProvider(config);

  const redirectUrl = new URL(config.GOOGLE_REDIRECT_URI);
  const port = parseInt(redirectUrl.port, 10) || 3456;

  const authUrl = auth.getAuthUrl();
  console.log("\n=== MCP Gmail + Google Docs — Authorization ===\n");
  console.log("Open this URL in your browser to authorize:\n");
  console.log(authUrl);
  console.log("\nWaiting for authorization...\n");

  try {
    const open = (await import("open")).default;
    await open(authUrl);
  } catch {
    console.log("(Could not auto-open browser. Please open the URL manually.)");
  }

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
        const code = reqUrl.searchParams.get("code");
        const error = reqUrl.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
          server.close();
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Missing authorization code</h1>");
          return;
        }

        await auth.handleCallback(code);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>",
        );
        console.log("Authorization successful! Tokens saved.");

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>Error</h1><p>${String(err)}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      console.log(`Listening for OAuth callback on http://127.0.0.1:${port}...`);
    });
  });

  const status = await auth.getAuthStatus();
  console.log("\nAuth status:", JSON.stringify(status, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error("Auth failed:", err);
  process.exit(1);
});
