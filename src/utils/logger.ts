import { ENV } from "../config/env";

export type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const currentLevel = (ENV.LOG_LEVEL as LogLevel) || "info";

const shouldLog = (level: LogLevel): boolean => {
  return levelWeight[level] >= levelWeight[currentLevel];
};

const writeLog = (
  level: LogLevel,
  scope: string,
  message: string,
  context?: Record<string, unknown>
): void => {
  if (!shouldLog(level)) return;
  const payload = {
    level,
    scope,
    message,
    context,
    timestamp: new Date().toISOString()
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const createLogger = (scope: string) => {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      writeLog("debug", scope, message, context),
    info: (message: string, context?: Record<string, unknown>) =>
      writeLog("info", scope, message, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      writeLog("warn", scope, message, context),
    error: (message: string, context?: Record<string, unknown>) =>
      writeLog("error", scope, message, context)
  };
};
