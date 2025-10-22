#!/usr/bin/env node
import crypto from 'node:crypto';

const API_URL = process.env.API_URL;
const SECRET = process.env.HMAC_SECRET;
const CLIENT_ID = process.env.CLIENT_ID || 'copilot-frontend';
const CUSTOMER_ID = process.env.CUSTOMER_ID || process.env.CID;

if (!API_URL || !SECRET || !CUSTOMER_ID) {
  console.error('Usage: API_URL=... HMAC_SECRET=... CUSTOMER_ID=... [CLIENT_ID=copilot-frontend] node infra/scripts/smoke_node.mjs');
  process.exit(1);
}

function signHmac(secret, timestamp, clientId, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${clientId}.${body}`, 'utf8').digest('hex');
}

async function callTool(endpoint, bodyObj) {
  const body = JSON.stringify(bodyObj);
  const t = Date.now().toString();
  const sig = signHmac(SECRET, t, CLIENT_ID, body);
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': t,
      'X-Client': CLIENT_ID,
      'X-Signature': sig,
    },
    body,
  });
  const text = await res.text();
  console.log(`\n=== POST ${endpoint} ===`);
  console.log('HTTP', res.status);
  console.log(text);
}

const reqUsage = { customerId: CUSTOMER_ID, params: { periodDays: 30 } };
const req = { customerId: CUSTOMER_ID, params: {} };

await callTool('get_customer_usage', reqUsage);
await callTool('get_recent_tickets', req);
await callTool('get_contract_info', req);
await callTool('calculate_health', req);
await callTool('generate_email', req);
await callTool('generate_qbr_outline', req);

