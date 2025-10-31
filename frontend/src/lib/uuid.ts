/**
 * Generate a UUID v4 string compatible with all browsers including iOS Safari.
 * Falls back to Math.random() if crypto is unavailable.
 */
export function generateUUID(): string {
  // Try modern crypto API first
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    try {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);

      // Set version to 4
      arr[6] = (arr[6] & 0x0f) | 0x40;
      // Set variant to RFC 4122
      arr[8] = (arr[8] & 0x3f) | 0x80;

      const hex = Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
      )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: generate UUID-like string using Math.random()
  // This is less ideal but works on all browsers
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      result += "-";
    } else if (i === 14) {
      result += "4"; // Version 4
    } else if (i === 19) {
      result += chars[(Math.random() * 4) | 0x8]; // Variant bits
    } else {
      result += chars[Math.floor(Math.random() * 16)];
    }
  }
  return result;
}
