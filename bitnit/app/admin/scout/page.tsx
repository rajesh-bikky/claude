import Link from "next/link";
import { connection } from "next/server";
import { describeTargeting, scoutIfStale } from "@/lib/agent";
import { aiConfigured } from "@/lib/ai";
import { getStore, save } from "@/lib/store";
import { audience } from "@/lib/targeting";
import type { Suggestion } from "@/lib/types";
import { Nav } from "../../nav";
import { ProjectionView } from "../viz";
import { GenerateButton, SuggestionActions } from "./actions";

const ORIGIN = {
  goal: { label: "Goal friction", icon: "◎" },
  feedback: { label: "User feedback", icon: "❝" },
  usage: { label: "Usage pattern", icon: "▤" },
} as const;

function ago(iso?: string) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

export default async function Scout({ searchParams }: PageProps<"/admin/scout">) {
  await connection();
  const { goal: goalFilter } = await searchParams;
  const store = getStore();
  if (scoutIfStale(store)) save();

  const users = Object.values(store.users);
  const goals = new Map(store.goals.map((g) => [g.id, g]));
  const order = { goal: 0, feedback: 1, usage: 2 };
  const pending = store.suggestions
    .filter((s) => s.status === "pending" && (!goalFilter || s.goalId === goalFilter))
    .sort((a, b) => order[a.origin ?? "usage"] - order[b.origin ?? "usage"]);
  const discarded = store.suggestions.filter((s) => s.status === "discarded");

  return (
    <div className="shell">
      <Nav />
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "12px 0 20px" }}>
        <div style={{ maxWidth: 640 }}>
          <div className="eyebrow">Agent · scans daily · last scan {ago(store.lastScanAt)}</div>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 6 }}>Scouted bits</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            The Scout watches your <Link href="/admin/goals">goals</Link>, your analytics and what users tell you, and drafts bits
            for whatever is holding users back. Nothing reaches users until you edit and launch it.
          </p>
        </div>
        <GenerateButton ai={aiConfigured()} />
      </div>

      {store.goals.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          <Link href="/admin/scout" className={`btn${!goalFilter ? " primary" : ""}`} style={{ padding: "5px 10px" }}>All</Link>
          {store.goals.map((g) => (
            <Link key={g.id} href={`/admin/scout?goal=${g.id}`} className={`btn${goalFilter === g.id ? " primary" : ""}`} style={{ padding: "5px 10px" }}>
              ◎ {g.title}
            </Link>
          ))}
        </div>
      )}

      <div className="grid" style={{ gap: 16 }}>
        {pending.length === 0 && <div className="card faint">Nothing waiting for review. Run a scan, or add a goal for the Scout to work toward.</div>}
        {pending.map((s) => (
          <ScoutCard key={s.id} s={s} goal={s.goalId ? goals.get(s.goalId)?.title : undefined} eligible={audience(s.targeting, users).eligible} />
        ))}
      </div>

      {discarded.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary className="small muted" style={{ cursor: "pointer" }}>{discarded.length} discarded</summary>
          <div className="grid" style={{ gap: 8, marginTop: 10 }}>
            {discarded.map((s) => (
              <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14 }}>
                <span>{s.title}</span>
                <SuggestionActions id={s.id} discarded />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ScoutCard({ s, goal, eligible }: { s: Suggestion; goal?: string; eligible: number }) {
  const o = ORIGIN[s.origin ?? "usage"];
  return (
    <article className="card grid cols-2" style={{ alignItems: "start", gap: 24 }}>
      <div className="grid" style={{ gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill"><span aria-hidden>{o.icon}</span>{o.label}</span>
          {goal && <span className="pill inconclusive">Goal: {goal}</span>}
          <span className="small faint">{s.source === "claude" ? "by Claude" : "by rules"} · {s.effortWeeks} eng-week{s.effortWeeks === 1 ? "" : "s"} · {eligible} users qualify</span>
        </div>
        <h2 style={{ fontSize: 19 }}>{s.title}</h2>
        <div>
          <div className="eyebrow">What it solves</div>
          <div>{s.problem}</div>
        </div>
        <div>
          <div className="eyebrow">How it solves it</div>
          <div>{s.solution}</div>
        </div>
        <div>
          <div className="eyebrow">What the Scout saw</div>
          <div className="small">{s.rationale}</div>
          <ul className="small muted" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {s.evidence.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
        <div className="small faint">Would ask: {describeTargeting(s.targeting)}</div>
      </div>
      <div className="grid" style={{ gap: 14 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Projected result · bar 35%</div>
          <ProjectionView p={s.projection} bar={0.35} />
        </div>
        <div style={{ display: "flex", justifyContent: "end" }}><SuggestionActions id={s.id} /></div>
      </div>
    </article>
  );
}
