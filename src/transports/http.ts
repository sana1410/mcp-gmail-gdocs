import express from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import type { Config } from "../config.js";
import { getAllowedOrigins } from "../config.js";
import { logger } from "../logger.js";

export type ServerFactory = () => McpServer;

export async function startHttp(serverFactory: ServerFactory, config: Config): Promise<void> {
  const app = express();
  const allowedOrigins = getAllowedOrigins(config);

  app.use(express.json());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn("Rejected request from invalid origin", { origin });
      res.status(403).json({ error: "Forbidden: invalid origin" });
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Protocol-Version, Mcp-Session-Id");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      const sid = (transport as unknown as { _sessionId?: string })._sessionId;
      if (sid) sessions.delete(sid);
    };

    const sessionServer = serverFactory();
    await sessionServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    const respSessionId = res.getHeader("mcp-session-id") as string | undefined;
    if (respSessionId) {
      sessions.set(respSessionId, transport);
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.handleRequest(req, res);
      return;
    }
    res.status(400).json({ error: "Missing or invalid session ID" });
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.handleRequest(req, res);
      sessions.delete(sessionId);
      return;
    }
    res.status(400).json({ error: "Missing or invalid session ID" });
  });

  const host = config.HTTP_HOST;
  const port = config.HTTP_PORT;
  app.listen(port, host, () => {
    logger.info(`MCP HTTP server listening on http://${host}:${port}`);
    logger.info(`MCP endpoint: http://${host}:${port}/mcp`);
    logger.info(`Health check: http://${host}:${port}/healthz`);
  });
}
