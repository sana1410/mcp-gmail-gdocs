import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../logger.js";

export async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  logger.info("Starting MCP server in stdio mode");
  await server.connect(transport);
  logger.info("MCP server connected via stdio");
}
