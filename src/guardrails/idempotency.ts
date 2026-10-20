import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  result: unknown;
  created_at: number;
}

export class IdempotencyCache {
  private filePath: string;
  private cache: Map<string, CacheEntry>;

  constructor(filePath?: string) {
    this.filePath = filePath ?? this.defaultPath();
    this.cache = new Map();
    this.loadFromDisk();
  }

  private defaultPath(): string {
    const configDir = process.env.XDG_CONFIG_HOME
      || (process.platform === "win32"
        ? path.join(os.homedir(), "AppData", "Roaming")
        : path.join(os.homedir(), ".config"));
    return path.join(configDir, "mcp-gmail-gdocs", "idempotency.json");
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
        if (Array.isArray(data)) {
          for (const [key, entry] of data) {
            this.cache.set(key, entry as CacheEntry);
          }
        }
      }
    } catch {
      // start fresh on corruption
    }
  }

  private saveToDisk(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const entries = [...this.cache.entries()];
    fs.writeFileSync(this.filePath, JSON.stringify(entries), "utf-8");
  }

  private cleanup(): void {
    const cutoff = Date.now() - DEFAULT_TTL_MS;
    for (const [key, entry] of this.cache) {
      if (entry.created_at < cutoff) {
        this.cache.delete(key);
      }
    }
  }

  get(key: string): unknown | null {
    this.cleanup();
    const entry = this.cache.get(key);
    return entry ? entry.result : null;
  }

  set(key: string, result: unknown): void {
    this.cleanup();
    this.cache.set(key, { result, created_at: Date.now() });
    this.saveToDisk();
  }

  close(): void {
    this.saveToDisk();
  }
}
