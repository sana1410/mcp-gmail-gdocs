import { z } from "zod";

const configSchema = z.object({
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  HTTP_HOST: z.string().default("127.0.0.1"),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  PUBLIC_BASE_URL: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().default("http://127.0.0.1:3456/oauth2callback"),
  TOKEN_STORE_PATH: z.string().optional(),
  GOOGLE_TOKENS_BASE64: z.string().optional(),

  ALLOWED_ORIGINS: z.string().optional(),
  ALLOWED_RECIPIENTS: z.string().optional(),
  ALLOWED_RECIPIENT_DOMAINS: z.string().optional(),
  ALLOWED_DOCUMENT_IDS: z.string().optional(),

  MAX_EMAILS_PER_HOUR: z.coerce.number().int().min(1).default(20),
  MAX_EMAILS_PER_DAY: z.coerce.number().int().min(1).default(100),
  MAX_APPENDS_PER_HOUR: z.coerce.number().int().min(1).default(100),
  MAX_BODY_SIZE_BYTES: z.coerce.number().int().min(1).default(102400),
  MAX_APPEND_SIZE_BYTES: z.coerce.number().int().min(1).default(51200),
  MAX_RECIPIENTS: z.coerce.number().int().min(1).default(25),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const config = configSchema.parse(process.env);
  // Railway injects PORT — use it as HTTP_PORT when present
  if (config.PORT) {
    config.HTTP_PORT = config.PORT;
  }
  return config;
}

export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function getAllowedOrigins(config: Config): string[] {
  const origins = parseList(config.ALLOWED_ORIGINS);
  if (origins.length === 0) {
    return [`http://127.0.0.1:${config.HTTP_PORT}`, `http://localhost:${config.HTTP_PORT}`];
  }
  return origins;
}
