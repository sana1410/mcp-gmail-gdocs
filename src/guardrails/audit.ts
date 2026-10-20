import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class AuditLog {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath ?? this.defaultPath();
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  private defaultPath(): string {
    const configDir = process.env.XDG_CONFIG_HOME
      || (process.platform === "win32"
        ? path.join(os.homedir(), "AppData", "Roaming")
        : path.join(os.homedir(), ".config"));
    return path.join(configDir, "mcp-gmail-gdocs", "audit.log");
  }

  log(entry: {
    tool: string;
    action: string;
    detail: string;
    status: "success" | "error" | "dry_run" | "blocked";
  }): void {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    fs.appendFileSync(this.filePath, line + "\n", "utf-8");
  }
}
