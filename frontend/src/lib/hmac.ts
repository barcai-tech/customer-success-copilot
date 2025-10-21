import crypto from 'crypto';

export function signHmac(secret: string, timestampMs: string, clientId: string, rawBody: string): string {
  const msg = `${timestampMs}.${clientId}.${rawBody}`;
  return crypto.createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
}

export function nowMs(): string {
  return String(Date.now());
}

