# BITNIT — Build it or Nix it

An agent that lives inside a product, asks the *right* users whether they need a proposed feature, and tells the builder — with statistical confidence — whether to build it.

```bash
npm install
npm run dev   # http://localhost:3100
```

| Route | What it is |
|---|---|
| `/demo` | **Ledgerly**, a fictional invoicing app with the widget embedded. Switch between demo users to see who gets asked what. |
| `/admin` | Dashboard: eng-weeks saved by nixed bits, the pipeline (suggested → draft → collecting → ready → building / nixed), bits in progress. |
| `/admin/goals` | Product goals measured against the connected analytics source: current value vs target, the funnel, and where users get stuck. |
| `/admin/scout` | Scouted bits: drafts the Scout writes from goal friction, user feedback and usage patterns, each with evidence and a projected result. Edit & launch, or discard. |
| `/admin/settings` | Frequency cap: the most bits one user is asked about in 30 days (default 3). |
| `/admin/new` | Write a bit (what / solves / how) with word-count and leading-language checks, ✨ Tighten with AI, a live preview of the real widget, and the agent's projection. |
| `/admin/ideas/[id]` | Recommendation, stats, persona split, best-fit vs rest, Discovery (follow-up notes and an interview list), preview, projected-vs-actual, controls. |

## How it decides

**Who gets asked** (`lib/targeting.ts`). Each idea declares personas, the features a user must already use (min uses / 30 days), min tenure and a min fit score. Fit blends persona match (35%), log-scaled engagement with the relevant feature (50%) and tenure (15%). Of the live ideas a user hasn't answered or dismissed, the agent asks about the one they fit best, nudged toward ideas furthest from their target sample. If nothing fits, it stays quiet.

**What it recommends** (`lib/stats.ts`). The primary metric is the share answering 🔥 *Badly need it today*, with a 95% Wilson interval:

- interval entirely above the build bar → **Build it**
- interval entirely below → **Nix it**
- straddling → **Too close to call**, with an estimate of how many more responses would settle it
- fewer than 20 responses → **Collecting**

Secondary signals feed the narrative: one-sided p-value vs the bar, fit-weighted need rate, best-fit half vs the rest (two-proportion z-test), persona × answer χ² test, a high 🤷 share, and low response rates (non-response bias).

## The agent layer (`lib/agent.ts`)

Set `ANTHROPIC_API_KEY` (see `.env.example`) to use Claude (`claude-opus-5-5`, structured output). Without it every feature falls back to rules and says so in the UI.

- **Tighten with AI** — opt-in, never automatic. It rewrites for brevity and neutrality without adding claims, and the builder accepts each field or keeps theirs. Leading copy inflates "badly need it" and corrupts the decision, so neutrality matters as much as length.
- **Projection** — a statistical prior first: past bits weighted by how much their audience overlaps this one (Jaccard on eligible users), with the weighted spread as an ~80% range. Claude then adjusts for the idea's wording and past comments. The projection is stored at launch and compared with the actual result.
- **The Scout** — measures each goal in analytics (`lib/analytics.ts`, a deterministic demo source standing in for Segment/Amplitude/Mixpanel), finds the weakest funnel step and the persona hit hardest, and drafts bits for it. Claude also weighs usage, past bits and comments; the rules fallback uses a playbook per funnel step plus comment and usage patterns. A rules scan runs whenever the last one is a day old; "Scan now" runs the full pass. In production the daily scan would be a cron job.

## Respecting users

- **Frequency cap.** A user is asked about at most N distinct bits in any 30 days (`promptBudget` in `lib/targeting.ts`). Re-showing an unanswered card doesn't spend budget; dismissing does.
- **Tell us more.** After answering, each person gets the follow-up that is most useful for that answer (need: "What would you use it for first?", maybe: "What would make it a definite yes?", won't use: "What would you rather we build instead?") plus an opt-in to be contacted. These feed the Discovery panel and the Scout.

## Embedding in another product

```html
<script src="https://your-bitnit-host/bitnit.js"></script>
<script>
  BITNIT.init({
    user: { id, name, persona, plan, tenureDays, featureUsage: { invoices: 34 } },
    accent: "#4b3fd1",                 // optional
    onAnswer: ({ ideaId, answer }) => {} // optional
  });
</script>
```

The widget renders in a Shadow DOM so host CSS can't touch it. `BITNIT.preview(container, prompt)` renders the same card inline without recording anything; the console uses it for previews. The public API (`/api/v1/prompt`, `/respond`, `/dismiss`) is CORS-open.

## Prototype limits

- Storage is a JSON file (`data/store.json`, seeded with ~320 synthetic Ledgerly users on first run). Use a real database before production.
- The admin console and API have no auth, and `/api/v1` trusts whatever user traits the host sends — a real deployment needs per-product API keys and signed user payloads.
- Only the demo analytics source is real; the other sources on the Goals page mark where integrations would go.
