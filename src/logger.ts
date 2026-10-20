const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

function formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      entry[key] = value;
    }
  }
  return JSON.stringify(entry);
}

export const logger = {
  error(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("error")) process.stderr.write(formatEntry("error", message, data) + "\n");
  },
  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("warn")) process.stderr.write(formatEntry("warn", message, data) + "\n");
  },
  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("info")) process.stderr.write(formatEntry("info", message, data) + "\n");
  },
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog("debug")) process.stderr.write(formatEntry("debug", message, data) + "\n");
  },
};
