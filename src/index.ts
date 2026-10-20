#!/usr/bin/env node
import "dotenv/config";
import { loadConfig } from "./config.js";
import { setLogLevel } from "./logger.js";
import { logger } from "./logger.js";
import { createServer } from "./server.js";
import { startStdio } from "./transports/stdio.js";
import { startHttp } from "./transports/http.js";

async function main() {
  const config = loadConfig();
  setLogLevel(config.LOG_LEVEL);

  logger.info("Starting mcp-gmail-gdocs", { transport: config.MCP_TRANSPORT });

  if (config.MCP_TRANSPORT === "http") {
    await startHttp(() => createServer(config).server, config);
  } else {
    const { server } = createServer(config);
    await startStdio(server);
  }
}

main().catch((err) => {
  logger.error("Fatal error", { error: String(err) });
  process.exit(1);
});
