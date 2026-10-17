export type Answer = "need" | "maybe" | "nah";

/** What the host product tells BITNIT about the person using it. */
export type HostUser = {
  id: string;
  name: string;
  persona: string;
  plan: string;
  tenureDays: number;
  /** Uses per feature over the last 30 days, keyed by the host's feature ids. */
  featureUsage: Record<string, number>;
};

export type FeatureRule = { feature: string; minUses: number };

export type Targeting = {
  /** Empty means every persona is eligible. */
  personas: string[];
  /** The user must hit the minimum on at least one of these. Empty means no feature gate. */
  features: FeatureRule[];
  minTenureDays: number;
  /** 0..1 — users scoring below this are never asked. */
  minFit: number;
};

export type IdeaStatus = "draft" | "live" | "paused" | "decided";

export type Idea = {
  id: string;
  title: string;
  /** What it solves. */
  problem: string;
  /** How it solves it. */
  solution: string;
  status: IdeaStatus;
  targeting: Targeting;
  /** Share of "badly need it" answers that justifies building. */
  buildThreshold: number;
  /** Responses we aim to collect before calling it. */
  targetSample: number;
  decision?: { verdict: "build" | "nix"; note: string; at: string };
  /** Builder's estimate of engineering effort, used to report what a "nix" saved. */
  effortWeeks?: number;
  /** The agent's projection when the bit was launched, kept to compare with reality. */
  projection?: Projection;
  /** Set when the bit started life as a scouted bit. */
  fromSuggestion?: string;
  /** The product goal this bit is meant to move, if any. */
  goalId?: string;
  createdAt: string;
};

export type Projection = {
  /** Projected share answering "badly need it". */
  needRate: number;
  low: number;
  high: number;
  likely: "build" | "nix" | "uncertain";
  basis: string[];
  risks: string[];
  source: "claude" | "prior";
};

export type Suggestion = {
  id: string;
  title: string;
  problem: string;
  solution: string;
  targeting: Targeting;
  effortWeeks: number;
  rationale: string;
  evidence: string[];
  projection: Projection;
  status: "pending" | "accepted" | "discarded";
  source: "claude" | "rules";
  /** What the Scout noticed: friction against a goal, a usage pattern, or user feedback. */
  origin: "goal" | "usage" | "feedback";
  goalId?: string;
  createdAt: string;
};

export type Response = {
  id: string;
  ideaId: string;
  userId: string;
  answer: Answer;
  comment?: string;
  /** The user agreed to be contacted about this bit — a discovery lead. */
  contactOk?: boolean;
  /** Fit score and persona captured when the question was shown. */
  fit: number;
  persona: string;
  createdAt: string;
};

export type Impression = {
  ideaId: string;
  userId: string;
  at: string;
  dismissed?: boolean;
};

export type Store = {
  users: Record<string, HostUser>;
  ideas: Idea[];
  responses: Response[];
  impressions: Impression[];
  suggestions: Suggestion[];
  goals: Goal[];
  settings: Settings;
  lastScanAt?: string;
};

export type Goal = {
  id: string;
  title: string;
  /** Key of a metric the connected analytics source can compute. */
  metric: string;
  /** Target value for the metric, 0..1. */
  target: number;
  createdAt: string;
};

export type Settings = {
  /** Most distinct bits a single user is asked about in any 30-day window. */
  maxBitsPer30d: number;
};
