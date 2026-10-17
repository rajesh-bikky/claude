# BITNIT — Build it or Nix it

An agent that lives inside a product, asks the *right* users whether they need a proposed feature, and tells the builder — with statistical confidence — whether to build it.

```bash
npm install
npm run dev   # http://localhost:3100
```

| Route | What it is |
|---|---|
| `/demo` | **Ledgerly**, a fictional invoicing app with the widget embedded. Switch between demo users to see who gets asked what. |
| `/admin` | Builder console: every idea, its answers, need-rate interval vs the build bar, and the call. |
| `/admin/ideas/[id]` | Recommendation, stats, persona split, best-fit vs rest, comments, targeting, controls. |
| `/admin/new` | Draft an idea (what / solves / how), set targeting and the decision rule, see reachable audience live. |

## How it decides

**Who gets asked** (`lib/targeting.ts`). Each idea declares personas, the features a user must already use (min uses / 30 days), min tenure and a min fit score. Fit blends persona match (35%), log-scaled engagement with the relevant feature (50%) and tenure (15%). Of the live ideas a user hasn't answered or dismissed, the agent asks about the one they fit best, nudged toward ideas furthest from their target sample. If nothing fits, it stays quiet.

**What it recommends** (`lib/stats.ts`). The primary metric is the share answering 🔥 *Badly need it today*, with a 95% Wilson interval:

- interval entirely above the build bar → **Build it**
- interval entirely below → **Nix it**
- straddling → **Too close to call**, with an estimate of how many more responses would settle it
- fewer than 20 responses → **Collecting**

Secondary signals feed the narrative: one-sided p-value vs the bar, fit-weighted need rate, best-fit half vs the rest (two-proportion z-test), persona × answer χ² test, a high 🤷 share, and low response rates (non-response bias).

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

The widget renders in a Shadow DOM so host CSS can't touch it. The public API (`/api/v1/prompt`, `/respond`, `/dismiss`) is CORS-open.

## Prototype limits

- Storage is a JSON file (`data/store.json`, seeded with ~320 synthetic Ledgerly users on first run). Use a real database before production.
- The admin console and API have no auth, and `/api/v1` trusts whatever user traits the host sends — a real deployment needs per-product API keys and signed user payloads.
- No frequency cap beyond "one answer per idea per user".
