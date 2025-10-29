// Simple runtime-toggled logger for client and server
// - Client: enable via NEXT_PUBLIC_DEBUG_LOGS=1 or localStorage.DEBUG_LOGS="1"
// - Server: enable via DEBUG_LOGS=1

type Level = "debug" | "info" | "warn" | "error";

const isServer = typeof window === "undefined";

function clientEnabled(): boolean {
  try {
    // Prefer explicit env toggle injected by Next
    if (process.env.NEXT_PUBLIC_DEBUG_LOGS === "1") return true;
    // Allow quick toggle from DevTools
    if (!isServer && typeof localStorage !== "undefined") {
      return localStorage.getItem("DEBUG_LOGS") === "1";
    }
  } catch {}
  return false;
}

function serverEnabled(): boolean {
  return process.env.DEBUG_LOGS === "1" || process.env.LLM_DEBUG === "1";
}

function isEnabled(): boolean {
  return isServer ? serverEnabled() : clientEnabled();
}

function log(level: Level, ...args: unknown[]) {
  if (!isEnabled()) return;
  const prefix = "[app]";
  // eslint-disable-next-line no-console
  if (level === "debug") console.debug(prefix, ...args);
  // eslint-disable-next-line no-console
  else if (level === "info") console.info(prefix, ...args);
  // eslint-disable-next-line no-console
  else if (level === "warn") console.warn(prefix, ...args);
  // eslint-disable-next-line no-console
  else console.error(prefix, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => log("debug", ...args),
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  error: (...args: unknown[]) => log("error", ...args),
  enabled: isEnabled,
};

