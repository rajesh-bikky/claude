import { connection } from "next/server";
import { describeTargeting } from "@/lib/agent";
import { aiConfigured } from "@/lib/ai";
import { getStore } from "@/lib/store";
import { audience } from "@/lib/targeting";
import { Nav } from "../../nav";
import { ProjectionView } from "../viz";
import { GenerateButton, SuggestionActions } from "./actions";

export default async function Suggested() {
  await connection();
  const store = getStore();
  const users = Object.values(store.users);
  const pending = store.suggestions.filter((s) => s.status === "pending");
  const discarded = store.suggestions.filter((s) => s.status === "discarded");

  return (
    <div className="shell">
      <Nav />
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "12px 0 20px" }}>
        <div style={{ maxWidth: 620 }}>
          <div className="eyebrow">Agent</div>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 6 }}>Suggested bits</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Ideas BITNIT found in how people use Ledgerly and what they’ve told you, each with a projected result. Nothing reaches
            users until you edit and launch it.
          </p>
        </div>
        <GenerateButton ai={aiConfigured()} />
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {pending.length === 0 && <div className="card faint">No suggestions waiting. Ask the agent to look for new bits.</div>}
        {pending.map((s) => {
          const aud = audience(s.targeting, users);
          return (
            <article key={s.id} className="card grid cols-2" style={{ alignItems: "start", gap: 24 }}>
              <div className="grid" style={{ gap: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="pill">{s.source === "claude" ? "✨ Claude" : "Rules"}</span>
                  <span className="small faint">{s.effortWeeks} eng-week{s.effortWeeks === 1 ? "" : "s"} · {aud.eligible} users qualify</span>
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
                  <div className="eyebrow">Why the agent suggests it</div>
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
        })}
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
