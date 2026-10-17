import type { HostUser } from "./types";

/** Named users the demo product lets you switch between. Never seeded with answers. */
export const DEMO_USERS: HostUser[] = [
  {
    id: "u_priya",
    name: "Priya Shah",
    persona: "freelancer",
    plan: "Pro",
    tenureDays: 410,
    featureUsage: { invoices: 34, time_tracking: 52, expenses: 6, multi_currency: 0, reports: 2, client_portal: 1 },
  },
  {
    id: "u_marcus",
    name: "Marcus Lee",
    persona: "agency",
    plan: "Team",
    tenureDays: 220,
    featureUsage: { invoices: 80, time_tracking: 120, expenses: 14, multi_currency: 3, reports: 18, client_portal: 40 },
  },
  {
    id: "u_dana",
    name: "Dana Ortiz",
    persona: "accountant",
    plan: "Pro",
    tenureDays: 640,
    featureUsage: { invoices: 9, time_tracking: 0, expenses: 30, multi_currency: 12, reports: 45, client_portal: 4 },
  },
  {
    id: "u_sam",
    name: "Sam Okafor",
    persona: "smb",
    plan: "Starter",
    tenureDays: 6,
    featureUsage: { invoices: 3, time_tracking: 0, expenses: 1, multi_currency: 0, reports: 0, client_portal: 0 },
  },
];
