// Synthetic Ledgerly customers and a few ideas at different stages, so the
// admin side has something to analyze on first run. Deterministic (seeded RNG).

import { priorProjection, scoutWithRules } from "./agent";
import { promptBudget, scoreFit } from "./targeting";
import { DEMO_USERS } from "./demo-users";
import type { Answer, HostUser, Idea, Store } from "./types";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


const USAGE_BY_PERSONA: Record<string, Record<string, number>> = {
  freelancer: { invoices: 20, time_tracking: 30, expenses: 6, multi_currency: 2, reports: 2, client_portal: 1 },
  agency: { invoices: 45, time_tracking: 60, expenses: 10, multi_currency: 3, reports: 12, client_portal: 20 },
  accountant: { invoices: 8, time_tracking: 2, expenses: 25, multi_currency: 6, reports: 35, client_portal: 3 },
  smb: { invoices: 12, time_tracking: 3, expenses: 18, multi_currency: 1, reports: 8, client_portal: 2 },
};

const FIRST = ["Ava", "Ben", "Chloe", "Dev", "Elif", "Finn", "Gia", "Hugo", "Ines", "Jae", "Kofi", "Lena", "Mo", "Nia", "Omar", "Pia", "Quinn", "Rui", "Sara", "Tomas", "Uma", "Vik", "Wen", "Yara", "Zed"];
const LAST = ["Adams", "Bose", "Chen", "Diaz", "Eze", "Fox", "Gupta", "Hale", "Ito", "Jones", "Khan", "Lund", "Moss", "Novak", "Oh", "Park", "Reyes", "Silva", "Tan", "Vega", "Wu", "Young"];

type ResponseModel = (fit: number, persona: string, r: () => number) => Answer;

const model =
  (needBase: number, needPerFit: number, maybe: number, personaBoost: Record<string, number> = {}): ResponseModel =>
  (fit, persona, r) => {
    const pNeed = Math.min(0.95, needBase + needPerFit * fit + (personaBoost[persona] ?? 0));
    const x = r();
    if (x < pNeed) return "need";
    if (x < pNeed + maybe * (1 - pNeed)) return "maybe";
    return "nah";
  };

export function buildSeed(): Store {
  const r = rng(42);
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400000 - r() * 86400000).toISOString();

  const personaPool = [
    ...Array(35).fill("freelancer"),
    ...Array(20).fill("agency"),
    ...Array(20).fill("accountant"),
    ...Array(25).fill("smb"),
  ];
  const users: HostUser[] = [];
  for (let i = 0; i < 320; i++) {
    const persona = personaPool[Math.floor(r() * personaPool.length)];
    const featureUsage: Record<string, number> = {};
    for (const [f, base] of Object.entries(USAGE_BY_PERSONA[persona])) {
      // Long-tailed usage: many light users, a few heavy ones, some who never touch it.
      featureUsage[f] = r() < 0.15 ? 0 : Math.round(base * Math.exp((r() - 0.5) * 1.8));
    }
    users.push({
      id: `u_${(1000 + i).toString(36)}`,
      name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
      persona,
      plan: r() < 0.5 ? "Pro" : r() < 0.6 ? "Team" : "Starter",
      tenureDays: Math.round(5 + r() * 900),
      featureUsage,
    });
  }

  const ideas: (Idea & { _model?: ResponseModel; _want?: number })[] = [
    {
      id: "auto-chase",
      effortWeeks: 3,
      title: "Auto-chase overdue invoices",
      problem: "Chasing late payments is awkward, manual and easy to forget — so cash shows up weeks late.",
      solution: "Ledgerly sends polite, escalating reminders on a schedule you choose and stops the moment the client pays.",
      status: "live",
      targeting: { personas: ["freelancer", "agency", "smb"], features: [{ feature: "invoices", minUses: 5 }], minTenureDays: 14, minFit: 0.4 },
      buildThreshold: 0.35,
      targetSample: 120,
      createdAt: daysAgo(21),
      _model: model(0.2, 0.45, 0.5),
      _want: 140,
    },
    {
      id: "time-to-invoice",
      effortWeeks: 2,
      title: "One-click invoice from tracked time",
      problem: "Turning a week of time entries into an invoice means copying hours line by line.",
      solution: "Pick a client and date range; Ledgerly groups the tracked hours into a ready-to-send invoice.",
      status: "live",
      targeting: { personas: ["freelancer", "agency"], features: [{ feature: "time_tracking", minUses: 10 }], minTenureDays: 7, minFit: 0.5 },
      buildThreshold: 0.4,
      targetSample: 100,
      createdAt: daysAgo(9),
      _model: model(-0.2, 0.55, 0.55, { agency: 0.05 }),
      _want: 46,
    },
    {
      id: "crypto-payouts",
      effortWeeks: 8,
      title: "Pay contractors in crypto",
      problem: "Paying international contractors involves slow wires and FX fees.",
      solution: "Send contractor payouts in USDC straight from Ledgerly, with the transaction logged as an expense.",
      status: "live",
      targeting: { personas: [], features: [{ feature: "multi_currency", minUses: 2 }], minTenureDays: 30, minFit: 0.3 },
      buildThreshold: 0.3,
      targetSample: 80,
      createdAt: daysAgo(30),
      _model: model(0.06, 0.08, 0.3),
      _want: 92,
    },
    {
      id: "receipt-snap",
      effortWeeks: 5,
      title: "Snap-a-receipt expense capture",
      problem: "Receipts pile up in wallets and inboxes until month-end, then get lost.",
      solution: "Photograph a receipt on your phone; Ledgerly reads the amount, vendor and date and files the expense.",
      status: "live",
      targeting: { personas: [], features: [{ feature: "expenses", minUses: 4 }], minTenureDays: 0, minFit: 0.35 },
      buildThreshold: 0.35,
      targetSample: 100,
      createdAt: daysAgo(2),
      _model: model(0.3, 0.3, 0.5),
      _want: 9,
    },
    {
      id: "accountant-workspace",
      effortWeeks: 10,
      title: "Multi-client workspace for accountants",
      problem: "Accountants juggle a separate login for every client's books.",
      solution: "One workspace that lists all your clients' Ledgerly books, with switching and roll-up reports.",
      status: "draft",
      targeting: { personas: ["accountant"], features: [{ feature: "reports", minUses: 8 }], minTenureDays: 30, minFit: 0.5 },
      buildThreshold: 0.4,
      targetSample: 60,
      createdAt: daysAgo(1),
    },
    {
      id: "payroll",
      effortWeeks: 16,
      title: "Built-in payroll",
      problem: "Paying employees means a separate payroll tool and re-entering numbers into the books.",
      solution: "Run payroll inside Ledgerly, with payslips, tax withholding and automatic bookkeeping entries.",
      status: "decided",
      decision: { verdict: "nix", note: "Users already have payroll providers they trust.", at: daysAgo(40) },
      targeting: { personas: ["smb", "agency"], features: [], minTenureDays: 30, minFit: 0.3 },
      buildThreshold: 0.3,
      targetSample: 80,
      createdAt: daysAgo(70),
      _model: model(0.04, 0.08, 0.35),
      _want: 84,
    },
    {
      id: "templates",
      effortWeeks: 2,
      title: "Invoice template gallery",
      problem: "Default invoices look generic, and building a branded one from scratch takes too long.",
      solution: "Pick from a gallery of professional templates and apply your logo and colours in one step.",
      status: "decided",
      decision: { verdict: "build", note: "", at: daysAgo(30) },
      targeting: { personas: ["freelancer", "agency", "smb"], features: [{ feature: "invoices", minUses: 3 }], minTenureDays: 7, minFit: 0.35 },
      buildThreshold: 0.3,
      targetSample: 100,
      createdAt: daysAgo(55),
      _model: model(0.15, 0.35, 0.5),
      _want: 104,
    },
  ];

  const store: Store = {
    users: {},
    ideas: [],
    responses: [],
    impressions: [],
    suggestions: [],
    goals: [
      { id: "goal_paid", title: "Get paid on time", metric: "paid_on_time", target: 0.7, createdAt: daysAgo(40) },
      { id: "goal_activate", title: "New users send an invoice in week one", metric: "activation", target: 0.5, createdAt: daysAgo(40) },
    ],
    settings: { maxBitsPer30d: 3 },
  };
  for (const u of [...users, ...DEMO_USERS]) store.users[u.id] = u;

  let rid = 0;
  for (const { _model, _want, ...idea } of ideas) {
    store.ideas.push(idea);
    if (!_model || !_want) continue;
    const ageDays = (Date.now() - Date.parse(idea.createdAt)) / 86400000;
    const pool = users
      .map((u) => ({ u, f: scoreFit(u, idea.targeting) }))
      .filter((x) => x.f.eligible)
      .sort(() => r() - 0.5);
    for (const { u, f } of pool) {
      if (store.responses.filter((x) => x.ideaId === idea.id).length >= _want) break;
      const at = daysAgo(r() * ageDays);
      // History respects the frequency cap too.
      if (promptBudget(u.id, store, Date.parse(at)).remaining === 0) continue;
      // About a third of people who see the question dismiss it.
      if (r() < 0.32) {
        store.impressions.push({ ideaId: idea.id, userId: u.id, at, dismissed: true });
        continue;
      }
      store.impressions.push({ ideaId: idea.id, userId: u.id, at });
      store.responses.push({
        id: `r_${++rid}`,
        ideaId: idea.id,
        userId: u.id,
        answer: _model(f.fit, u.persona, r),
        fit: f.fit,
        persona: u.persona,
        createdAt: at,
      });
    }
  }

  // What people wrote in the optional "tell us more" box, matched to how they answered.
  const comments: Record<string, [Answer, string, boolean?][]> = {
    "auto-chase": [
      ["need", "I spend Friday afternoons chasing payments. This would give me that time back.", true],
      ["need", "Would pay extra for this on its own."],
      ["need", "Let me edit the tone of the reminders — some clients are friends.", true],
      ["maybe", "Only if I can switch it off for my biggest client."],
      ["nah", "I'd rather you let clients pay by card straight from the invoice."],
    ],
    "time-to-invoice": [
      ["maybe", "I already export to a spreadsheet, it's fine."],
      ["maybe", "Only if it handles different rates per project.", true],
      ["need", "Every Friday I copy hours across by hand.", true],
      ["nah", "My time and my invoices are in different tools anyway."],
    ],
    "crypto-payouts": [
      ["nah", "None of my clients would accept this."],
      ["nah", "Compliance nightmare for us."],
      ["nah", "What I need is online card payments, not crypto."],
    ],
    payroll: [
      ["nah", "We use Gusto and it works fine."],
      ["nah", "Would never move payroll into my invoicing app."],
    ],
    "receipt-snap": [["need", "Receipts fade before I get to them.", true]],
  };
  for (const [ideaId, list] of Object.entries(comments)) {
    const used = new Set<string>();
    for (const [answer, text, contact] of list) {
      const target = store.responses.find((x) => x.ideaId === ideaId && x.answer === answer && !used.has(x.id));
      if (!target) continue;
      used.add(target.id);
      target.comment = text;
      if (contact) target.contactOk = true;
    }
  }
  // What the agent would have projected for the newer bits, from the history before them.
  for (const idea of store.ideas.filter((i) => i.id === "time-to-invoice" || i.id === "receipt-snap")) {
    idea.projection = priorProjection(idea.targeting, idea.buildThreshold, store, idea.id);
  }
  scoutWithRules(store);
  return store;
}
