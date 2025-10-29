export const GLOBAL_OWNER_ID = "public";

export const GLOBAL_COMPANIES: Array<{ id: string; name: string }> = [
  { id: "acme-001", name: "Acme Corp" },
  { id: "globex-001", name: "Globex Corporation" },
  { id: "initech-001", name: "Initech" },
];

export const GLOBAL_CONTRACTS: Record<string, { renewalDate: string; arr: number }> = {
  "acme-001": { renewalDate: "2026-02-01T00:00:00Z", arr: 250000 },
  "globex-001": { renewalDate: "2026-06-01T00:00:00Z", arr: 400000 },
  "initech-001": { renewalDate: "2025-11-01T00:00:00Z", arr: 95000 },
};

export const GLOBAL_USAGE: Record<string, { trend: "up" | "down" | "flat"; avgDailyUsers: number; sparkline: number[] }> = {
  "acme-001": { trend: "up", avgDailyUsers: 82, sparkline: [77, 81, 85, 89] },
  "globex-001": { trend: "flat", avgDailyUsers: 120, sparkline: [118, 121, 119, 120] },
  "initech-001": { trend: "up", avgDailyUsers: 35, sparkline: [28, 31, 33, 35] },
};

export const GLOBAL_TICKETS: Record<string, { openTickets: number; recentTickets: Array<{ id: string; severity: string }> }> = {
  "acme-001": { openTickets: 2, recentTickets: [{ id: "T-901", severity: "low" }, { id: "T-902", severity: "medium" }] },
  "globex-001": { openTickets: 1, recentTickets: [{ id: "G-201", severity: "low" }] },
  "initech-001": { openTickets: 0, recentTickets: [] },
};

