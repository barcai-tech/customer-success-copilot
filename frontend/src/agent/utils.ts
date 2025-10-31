/**
 * Utility functions for the Copilot agent
 */

import { db } from "@/src/db/client";
import { companies } from "@/src/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/src/lib/logger";

/**
 * Extract customer display name from database
 * Returns undefined if not found
 */
export async function getDisplayName(
  customerId: string,
  ownerUserId: string
): Promise<string | undefined> {
  try {
    const row = await db
      .select({ name: companies.name })
      .from(companies)
      .where(
        and(
          eq(companies.ownerUserId, ownerUserId),
          eq(companies.externalId, customerId)
        )
      )
      .limit(1);
    return row?.[0]?.name;
  } catch (e) {
    logger.error("[getDisplayName error]", e);
    return undefined;
  }
}

/**
 * Validate that a customer belongs to a specific owner
 * Returns true if valid, false otherwise
 */
export async function validateCustomerOwnership(
  customerId: string,
  ownerUserId: string
): Promise<boolean> {
  try {
    const row = await db
      .select({ id: companies.externalId })
      .from(companies)
      .where(
        and(
          eq(companies.ownerUserId, ownerUserId),
          eq(companies.externalId, customerId)
        )
      )
      .limit(1);
    return row && row.length > 0;
  } catch (e) {
    logger.error("[validateCustomerOwnership error]", e);
    return false;
  }
}

/**
 * Heuristic extraction of a customer name mentioned by the user.
 * Looks for:
 * 1) quoted text, e.g. "Acme Corp"
 * 2) patterns after 'of' or 'for', e.g. health of Initech or QBR for Mega Corp
 * 3) a capitalized multi-word phrase fallback
 */
export function extractRequestedCustomerName(
  message: string
): string | undefined {
  const text = message.trim();

  // 1) Quoted phrase
  const quoted = text.match(/["""''']([^"""''']{2,})["""''']/);
  if (quoted?.[1]) return quoted[1].trim();

  // 2) of|for pattern
  const ofFor = text.match(/\b(?:of|for)\s+([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*)*)/);
  if (ofFor?.[1]) return ofFor[1].trim();

  // 3) Capitalized multi-word sequence
  const caps = text.match(/\b([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*){1,3})\b/);
  if (caps?.[1]) return caps[1].trim();

  return undefined;
}

/**
 * Compare two names ignoring case and whitespace variations
 */
export function namesEqualIgnoreCase(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Determine if a message is out of scope for customer success
 */
export function isOutOfScope(message: string): boolean {
  const s = message.toLowerCase();

  // Keywords that indicate CS domain
  const csKeywords = [
    "customer",
    "health",
    "renewal",
    "qbr",
    "ticket",
    "contract",
    "usage",
    "adoption",
    "email",
    "churn",
    "account",
    "onboard",
    "support",
    "escalat",
  ];
  const hasCs = csKeywords.some((k) => s.includes(k));

  // Out-of-scope indicators (comprehensive security + entertainment blocklist)
  const likelyOos = [
    // Entertainment & Trivia
    "movie",
    "actor",
    "celebrity",
    "lyrics",
    "recipe",
    "game cheat",
    "joke",
    "story",
    "poem",
    "weather",
    "what month",
    "what day",
    "what year",
    "math problem",
    // Prompt Injection & Jailbreak Attempts
    "ignore previous instructions",
    "forget previous instructions",
    "disregard prior",
    "override system",
    "ignore system",
    "follow these instructions instead",
    "now do",
    "do this instead",
    "act as",
    "roleplay as",
    "system prompt",
    "system:",
    "assistant:",
    "user:",
    "insert prompt",
    "hidden prompt",
    "hidden instruction",
    "prompt injection",
    "ai jailbreak",
    "prompt jailbreak",
    "prompt injection attack",
    "manipulate model",
    // Malicious Code & Exploitation
    "hack",
    "exploit",
    "bypass",
    "jailbreak",
    "<script>",
    "malicious input",
    "payload",
    "reverse shell",
    "bind shell",
    "meterpreter",
    "curl http",
    "wget http",
    "download and run",
    "execute this",
    "run this code",
    "eval(",
    "exec(",
    "`rm -rf`",
    "rm -rf /",
    // System Commands & Privilege Escalation
    "sudo",
    "passwd",
    "chown",
    "chmod",
    "scp ",
    "nc -l",
    "netcat",
    "bash -i",
    "python -c",
    "perl -e",
    "php -r",
    "base64 -d",
    "base64decode",
    "decode base64",
    "encode base64",
    // Web Exploitation
    "onerror=",
    "onload=",
    "javascript:",
    "data:text/html",
    "iframe",
    "iframe src",
    "<iframe",
    "document.write",
    "document.cookie",
    "cookie:",
    "set-cookie",
    // Secrets & Credentials
    "access_token",
    "api_key",
    "api-token",
    "secret_key",
    "private key",
    "ssh key",
    "pem",
    ".pem",
    ".key",
    ".p12",
    "keystore",
    "jwt secret",
    "oauth secret",
    "password",
    "admin password",
    "root password",
    "service account key",
    "gcp service account",
    "aws access key",
    "aws secret access key",
    "aws_session_token",
    "azure client secret",
    // Sensitive Data
    "credit card",
    "creditcard",
    "card number",
    "cvv",
    "cvc",
    "ssn",
    "social security",
    "social-security-number",
    "bank account",
    "routing number",
    "iban",
    "sort code",
    "passport number",
    "full name and address",
    "date of birth",
    "dob",
    "phone number",
    "email password",
    // Data Exfiltration
    "exfiltrate",
    "send me the file",
    "download attachment",
    "open link",
    "click here",
    // Social Engineering & Phishing
    "spearphish",
    "phishing",
    "malware",
    "virus",
    "trojan",
    "ransomware",
    "keylogger",
    "botnet",
    "command-and-control",
    "C2",
    "cryptominer",
    // Harmful Activities
    "how to make",
    "how to build",
    "how to create weapon",
    "bomb",
    "weapon",
    "illicit drugs",
    "manufacture drugs",
    "drug synthesis",
    "how to get away with",
    // Security Bypass
    "bypass filters",
    "circumvent",
    "workaround for restrictions",
    "disable",
    "disable security",
    "remove watermark",
    "crack",
    "cracking",
    "brute force",
    "bruteforce",
    // SQL & Database Injection
    "sql injection",
    "union select",
    "select * from",
    "drop table",
    "--",
    "' OR '1'='1",
    "\" OR \"1\"=\"1",
    "/*",
    "*/",
    "sqli",
    "sqlmap",
    // Path Traversal & File Access
    "../../etc/passwd",
    "/etc/passwd",
    "open /etc/passwd",
    "file://",
    "read file",
    "read files",
    "read system files",
    "list files",
    "ls -la",
    "dir /s",
    // System Introspection & DoS
    "ps aux",
    "top",
    "htop",
    "kill -9",
    "fork bomb",
    ":(){ :|: & };:",
    // Privilege Management
    "create user",
    "create admin",
    "grant privileges",
    "sudoers",
    "adduser",
    "usermod",
    "escalate privileges",
    "privilege escalation",
    // Exploit Research
    "how to exploit",
    "zero-day",
    "zeroday",
    "public exploit",
    "cvv leak",
    // Financial Fraud
    "carding",
    "carder",
    "credit card dump",
    "bitcoin wallet",
    "crypto wallet private key",
    "private seed",
    "mnemonic phrase",
    "seed phrase",
    "how to launder money",
    "money laundering",
    "sell data",
    // Dark Web & Anonymity
    "dark web",
    "tor hidden",
    "onion address",
    "onion://",
    // Account Compromise
    "bypass 2fa",
    "disable mfa",
    "how to hack account",
    // Network Reconnaissance & Scanning
    "reconnaissance",
    "recon",
    "scanning",
    "nmap",
    "masscan",
    "burpsuite",
    "fuzz",
    "fuzzer",
    // Web Vulnerabilities
    "xss",
    "csrf",
    "xxe",
    "file upload exploit",
    "upload webshell",
    "webshell",
    "phpinfo",
    "phpinfo()",
    "system('",
    "popen(",
    "child_process.exec",
    "require('child_process')",
    // Data Protection & Encryption
    "decrypt",
    "encrypt key",
    "key material",
    "private material",
    "secret material",
    "show me secrets",
    "expose secret",
    "expose secrets",
    "leak credentials",
    "publish private",
    // Security Policy Violations
    "do not log",
    "do not tell anyone",
    // Harmful Content
    "self-harm",
    "suicide",
    "kill yourself",
    "how to commit suicide",
    "assist in self-harm",
    "sexual content",
    "porn",
    "child abuse",
    "CP",
    "rape",
    "sexual assault",
    // Illegal Activities
    "illegal activity",
    "how to evade law",
    "how to forge",
    "forgery",
    "how to bypass background checks",
    "how to falsify documents",
    "how to fake identity",
    "doxx",
    "doxxing",
    "dox",
    "publish personal info",
    "targeted harassment",
    "threaten",
    "terrorism",
    "bomb making",
    "extremist",
    "how to join",
    "recruit for",
    // Spam & Abuse
    "inappropriate",
    "spam",
    "bulk email",
    "mass email",
    "email harvesting",
    "scrape emails",
    "automate scraping",
    "scrape website",
    "data scraping",
    "steal data",
    "steal credentials",
    // Ransomware & Extortion
    "encrypt files for ransom",
    "sell credentials",
    // Spoofing & Masking
    "phone spoof",
    "caller id spoofing",
    "spoof email",
    "spoofing",
    "mask ip",
    "vpn chain",
    "proxy chain",
    "tor chain",
    "hide ip",
    // Code Obfuscation & Anti-Analysis
    "obfuscate",
    "obfuscation",
    "packer",
    "encoder",
    "polymorphic",
    "anti-debug",
    "anti-analysis",
    // Sandbox & Environment Escape
    "sandbox escape",
    "escape sandbox",
    "escape VM",
    "escape container",
    "bypass sandbox",
    // CAPTCHAs & Automation Abuse
    "how to bypass captcha",
    "captcha solver",
    "ocr solver",
    // Model Attacks
    "poisoning",
    "data poisoning",
    "model poisoning",
    "model leak"
  ].some((k) => s.includes(k));

  return !hasCs && likelyOos;
}

/**
 * Check if user explicitly requested email draft
 */
export function requestsEmail(
  message: string,
  task: string | null = null
): boolean {
  const messageLower = message.toLowerCase();
  const taskLower = (task || "").toLowerCase();

  return (
    messageLower.includes("email") ||
    messageLower.includes("draft") ||
    messageLower.includes("message") ||
    taskLower === "renewal" ||
    taskLower.includes("email")
  );
}

/**
 * Check if user explicitly requested QBR outline
 */
export function requestsQbr(
  message: string,
  task: string | null = null
): boolean {
  const messageLower = message.toLowerCase();
  const taskLower = (task || "").toLowerCase();

  return (
    messageLower.includes("qbr") ||
    messageLower.includes("quarterly") ||
    messageLower.includes("business review") ||
    messageLower.includes("outline") ||
    taskLower === "qbr"
  );
}
