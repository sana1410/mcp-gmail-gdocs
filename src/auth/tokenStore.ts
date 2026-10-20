import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../logger.js";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

function defaultTokenPath(customPath?: string): string {
  if (customPath) return customPath;

  const configDir = process.env.XDG_CONFIG_HOME
    || (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Roaming")
      : path.join(os.homedir(), ".config"));

  const dir = path.join(configDir, "mcp-gmail-gdocs");
  fs.mkdirSync(dir, { recursive: true });

  const tokenFile = path.join(dir, "tokens.json");
  if (process.platform !== "win32") {
    try {
      if (fs.existsSync(tokenFile)) {
        fs.chmodSync(tokenFile, 0o600);
      }
    } catch {
      // best-effort permission setting
    }
  }
  return tokenFile;
}

function bootstrapFromEnv(filePath: string): void {
  const b64 = process.env.GOOGLE_TOKENS_BASE64;
  if (!b64) return;
  if (fs.existsSync(filePath)) return;

  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    JSON.parse(json); // validate
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, json, "utf-8");
    if (process.platform !== "win32") {
      try { fs.chmodSync(filePath, 0o600); } catch {}
    }
    logger.info("Bootstrapped tokens from GOOGLE_TOKENS_BASE64");
  } catch (err) {
    logger.warn("Failed to bootstrap tokens from GOOGLE_TOKENS_BASE64", { error: String(err) });
  }
}

export class TokenStore {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = defaultTokenPath(customPath);
    bootstrapFromEnv(this.filePath);
  }

  load(): StoredTokens | null {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data) as StoredTokens;
    } catch (err) {
      logger.warn("Failed to load tokens", { error: String(err) });
      return null;
    }
  }

  save(tokens: StoredTokens): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(tokens, null, 2), "utf-8");
    if (process.platform !== "win32") {
      try {
        fs.chmodSync(this.filePath, 0o600);
      } catch {
        // best-effort
      }
    }
    logger.info("Tokens saved", { path: this.filePath });
  }

  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch (err) {
      logger.warn("Failed to clear tokens", { error: String(err) });
    }
  }

  getPath(): string {
    return this.filePath;
  }
}
