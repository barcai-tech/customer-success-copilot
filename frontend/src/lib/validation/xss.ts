/**
 * XSS Detection and Prevention
 * Protects against cross-site scripting attacks
 */

/**
 * Check for XSS patterns in input
 */
export const hasXSSPatterns = (val: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
  ];
  return dangerousPatterns.some((pattern) => pattern.test(val));
};

/**
 * Check for CSP (Content Security Policy) violations
 */
export const hasCSPViolation = (val: string): boolean => {
  const violations = [
    /data:/i,
    /blob:/i,
    /javascript:/i,
    /<\s*script/i,
    /<\s*iframe/i,
  ];
  return violations.some((pattern) => pattern.test(val));
};

/**
 * Detect CSP violation (backward compatible)
 */
export function detectCSPViolation(input: string): boolean {
  return hasCSPViolation(input);
}
