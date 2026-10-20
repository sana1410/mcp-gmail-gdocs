import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GoogleAuthProvider } from "../auth/googleOAuth.js";

export function registerAuthStatus(server: McpServer, auth: GoogleAuthProvider): void {
  server.tool(
    "auth_status",
    "Check whether Google authorization is valid, which account is connected, and which scopes were granted. Use this to diagnose authentication issues.",
    {},
    async () => {
      try {
        const status = await auth.getAuthStatus();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                authenticated: false,
                error: String(err),
                hint: "Run the auth command to authorize: npx mcp-gmail-gdocs auth",
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
