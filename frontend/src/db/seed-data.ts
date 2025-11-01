export const GLOBAL_OWNER_ID = "public";

// Generate a random renewal date between 30-180 days in the future
function getRandomRenewalDate(): string {
  const now = new Date();
  const minDays = 30;
  const maxDays = 180;
  const randomDays =
    Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  const renewalDate = new Date(
    now.getTime() + randomDays * 24 * 60 * 60 * 1000
  );
  return renewalDate.toISOString();
}

export const GLOBAL_COMPANIES: Array<{ id: string; name: string }> = [
  { id: "acme-001", name: "Acme Corp" },
  { id: "globex-001", name: "Globex Corporation" },
  { id: "initech-001", name: "Initech" },
];

export const GLOBAL_CONTRACTS: Record<
  string,
  { renewalDate: string; arr: number }
> = {
  "acme-001": { renewalDate: getRandomRenewalDate(), arr: 250000 },
  "globex-001": { renewalDate: getRandomRenewalDate(), arr: 400000 },
  "initech-001": { renewalDate: getRandomRenewalDate(), arr: 95000 },
};

export const GLOBAL_USAGE: Record<
  string,
  { trend: "up" | "down" | "flat"; avgDailyUsers: number; sparkline: number[] }
> = {
  "acme-001": { trend: "up", avgDailyUsers: 82, sparkline: [77, 81, 85, 89] },
  "globex-001": {
    trend: "flat",
    avgDailyUsers: 120,
    sparkline: [118, 121, 119, 120],
  },
  "initech-001": {
    trend: "up",
    avgDailyUsers: 35,
    sparkline: [28, 31, 33, 35],
  },
};

export const GLOBAL_TICKETS: Record<
  string,
  {
    openTickets: number;
    recentTickets: Array<{ id: string; severity: string }>;
  }
> = {
  "acme-001": {
    openTickets: 2,
    recentTickets: [
      { id: "T-901", severity: "low" },
      { id: "T-902", severity: "medium" },
    ],
  },
  "globex-001": {
    openTickets: 1,
    recentTickets: [{ id: "G-201", severity: "low" }],
  },
  "initech-001": { openTickets: 0, recentTickets: [] },
};

/**
 * Refreshes renewal dates for public demo companies if they're in the past.
 * This ensures demo companies always have realistic future renewal dates.
 * Call this periodically or on app startup.
 */
export function refreshOverdueContractDates(): void {
  const now = new Date();

  for (const companyId of Object.keys(GLOBAL_CONTRACTS)) {
    const contract = GLOBAL_CONTRACTS[companyId];
    const renewalDate = new Date(contract.renewalDate);

    // If renewal date is in the past, generate a new one
    if (renewalDate < now) {
      GLOBAL_CONTRACTS[companyId].renewalDate = getRandomRenewalDate();
    }
  }
}
