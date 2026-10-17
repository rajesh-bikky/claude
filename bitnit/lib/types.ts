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
  createdAt: string;
};

export type Response = {
  id: string;
  ideaId: string;
  userId: string;
  answer: Answer;
  comment?: string;
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
};
