// A stand-in for the product's analytics (Segment, Amplitude, Mixpanel…).
// It derives deterministic funnels for Ledgerly from the known users, so
// goals have something real-looking to measure and the Scout something to scan.

import { personaLabel } from "./catalog";
import type { HostUser, Store } from "./types";

export type FunnelStep = { key: string; label: string };
export type Metric = {
  key: string;
  label: string;
  description: string;
  /** Unit counted at each step. */
  unit: string;
  steps: FunnelStep[];
};

export const METRICS: Metric[] = [
  {
    key: "paid_on_time",
    label: "Invoices paid on time",
    description: "Share of sent invoices paid within their payment terms.",
    unit: "invoices",
    steps: [
      { key: "sent", label: "Invoice sent" },
      { key: "viewed", label: "Viewed by client" },
      { key: "paid", label: "Paid within terms" },
    ],
  },
  {
    key: "activation",
    label: "First-week activation",
    description: "Share of new sign-ups who send their first invoice within 7 days.",
    unit: "sign-ups",
    steps: [
      { key: "signup", label: "Signed up" },
      { key: "client", label: "Added a client" },
      { key: "draft", label: "Created an invoice" },
      { key: "sent", label: "Sent it" },
    ],
  },
  {
    key: "month_close",
    label: "Books closed monthly",
    description: "Share of active accounts whose expenses are categorized and reconciled each month.",
    unit: "accounts",
    steps: [
      { key: "logged", label: "Expenses logged" },
      { key: "categorized", label: "All categorized" },
      { key: "reconciled", label: "Reconciled in a report" },
    ],
  },
];

export const metricByKey = (k: string) => METRICS.find((m) => m.key === k);

// Step-to-step conversion by persona: the "truth" this demo source reports.
// Values are chosen so each funnel has one clear weak step for some persona.
const CONVERSION: Record<string, Record<string, number[]>> = {
  paid_on_time: { freelancer: [0.86, 0.58], agency: [0.9, 0.47], accountant: [0.88, 0.71], smb: [0.79, 0.62] },
  activation: { freelancer: [0.74, 0.81, 0.77], agency: [0.69, 0.62, 0.8], accountant: [0.81, 0.85, 0.83], smb: [0.52, 0.66, 0.71] },
  month_close: { freelancer: [0.41, 0.72], agency: [0.48, 0.69], accountant: [0.63, 0.81], smb: [0.37, 0.6] },
};

/** Volume at the top of each funnel per user, per 30 days. */
function topOfFunnel(metric: string, u: HostUser) {
  if (metric === "paid_on_time") return u.featureUsage.invoices ?? 0;
  if (metric === "month_close") return (u.featureUsage.expenses ?? 0) > 0 ? 1 : 0;
  return u.tenureDays <= 30 ? 1 : 0;
}

export type Funnel = {
  metric: Metric;
  /** Overall conversion from first to last step — the goal metric's current value. */
  value: number;
  steps: { key: string; label: string; count: number; rate: number }[];
  byPersona: { persona: string; top: number; rates: number[]; value: number }[];
  /** The weakest step-to-step transition, and the persona hit hardest by it. */
  friction: { stepIndex: number; from: string; to: string; rate: number; persona: string; personaRate: number; lost: number } | null;
};

export function funnel(metricKey: string, store: Store): Funnel | null {
  const metric = metricByKey(metricKey);
  if (!metric) return null;
  const users = Object.values(store.users);
  const transitions = metric.steps.length - 1;

  const byPersona = Object.keys(CONVERSION[metric.key]).map((persona) => {
    const top = users.filter((u) => u.persona === persona).reduce((s, u) => s + topOfFunnel(metric.key, u), 0);
    // New sign-ups are rare in a mature sample; give activation a believable cohort.
    const scaledTop = metric.key === "activation" ? Math.max(top, 40) * 3 : top;
    const rates = CONVERSION[metric.key][persona];
    return { persona, top: scaledTop, rates, value: rates.reduce((a, r) => a * r, 1) };
  });

  const counts = Array(metric.steps.length).fill(0);
  byPersona.forEach((p) => {
    let c = p.top;
    counts[0] += c;
    p.rates.forEach((r, i) => {
      c *= r;
      counts[i + 1] += c;
    });
  });
  const steps = metric.steps.map((s, i) => ({
    ...s,
    count: Math.round(counts[i]),
    rate: i === 0 ? 1 : counts[i - 1] ? counts[i] / counts[i - 1] : 0,
  }));

  let friction: Funnel["friction"] = null;
  for (let i = 0; i < transitions; i++) {
    const rate = steps[i + 1].rate;
    if (!friction || rate < friction.rate) {
      const worst = [...byPersona].sort((a, b) => a.rates[i] - b.rates[i])[0];
      friction = {
        stepIndex: i,
        from: metric.steps[i].label,
        to: metric.steps[i + 1].label,
        rate,
        persona: worst.persona,
        personaRate: worst.rates[i],
        lost: Math.round(counts[i] - counts[i + 1]),
      };
    }
  }

  return { metric, value: counts[0] ? counts[transitions] / counts[0] : 0, steps, byPersona, friction };
}

export function describeFriction(f: Funnel) {
  const x = f.friction;
  if (!x) return "";
  return (
    `Only ${Math.round(x.rate * 100)}% of ${f.metric.unit} go from “${x.from}” to “${x.to}” — ` +
    `${x.lost.toLocaleString()} lost in 30 days. Worst for ${personaLabel(x.persona)}s (${Math.round(x.personaRate * 100)}%).`
  );
}

/** Connected sources. Only the demo source is real; the rest show where integrations would go. */
export const SOURCES = [
  { key: "demo", name: "Ledgerly events (demo)", kind: "Analytics", connected: true },
  { key: "segment", name: "Segment", kind: "Analytics", connected: false },
  { key: "amplitude", name: "Amplitude", kind: "Analytics", connected: false },
  { key: "mixpanel", name: "Mixpanel", kind: "Analytics", connected: false },
  { key: "intercom", name: "Intercom", kind: "Feedback", connected: false },
  { key: "jira", name: "Jira", kind: "Delivery", connected: false },
];
