import Link from "next/link";
import { connection } from "next/server";
import { analyze } from "@/lib/stats";
import { getStore } from "@/lib/store";
import { Nav } from "../nav";
import { ResetButton } from "./reset-button";
import { AnswerStack, IntervalBar, Legend, VerdictPill, pct } from "./viz";

export default async function Admin() {
  await connection();
  const store = getStore();
  const rows = store.ideas.map((idea) => ({ idea, a: analyze(idea, store.responses, store.impressions) }));
  const live = rows.filter((r) => r.idea.status === "live");
  const ready = live.filter((r) => r.a.verdict === "build" || r.a.verdict === "nix");

  return (
    <div className="shell">
      <Nav />
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "12px 0 20px" }}>
        <div>
          <div className="eyebrow">Builder console · Ledgerly</div>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", marginTop: 6 }}>Ideas</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ResetButton />
          <Link href="/admin/new" className="btn primary">+ New idea</Link>
        </div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="eyebrow">Live ideas</div>
          <div style={{ fontSize: 30, fontWeight: 800 }} className="num">{live.length}</div>
        </div>
        <div className="card">
          <div className="eyebrow">Ready to decide</div>
          <div style={{ fontSize: 30, fontWeight: 800 }} className="num">{ready.length}</div>
          <div className="small muted">statistically significant either way</div>
        </div>
        <div className="card">
          <div className="eyebrow">Responses collected</div>
          <div style={{ fontSize: 30, fontWeight: 800 }} className="num">{store.responses.length}</div>
          <div className="small muted">from {Object.keys(store.users).length} known users</div>
        </div>
      </div>

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ paddingLeft: 20 }}>Idea</th>
              <th>Status</th>
              <th>Responses</th>
              <th style={{ minWidth: 150 }}>Answers</th>
              <th style={{ minWidth: 150 }}>Need rate vs bar</th>
              <th>Call</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ idea, a }) => (
              <tr key={idea.id}>
                <td style={{ paddingLeft: 20 }}>
                  <Link href={`/admin/ideas/${idea.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{idea.title}</Link>
                  <div className="small faint" style={{ maxWidth: 360 }}>{idea.problem}</div>
                </td>
                <td><span className={`pill ${idea.status}`}>{idea.status}</span></td>
                <td className="num">{a.n}<span className="faint"> / {idea.targetSample}</span></td>
                <td><AnswerStack counts={a.counts} height={10} /></td>
                <td>
                  <IntervalBar a={a} compact />
                  {a.n > 0 && (
                    <div className="small muted num">
                      {pct(a.need.p)} <span className="faint">({pct(a.need.lo)}–{pct(a.need.hi)})</span>
                    </div>
                  )}
                </td>
                <td>
                  {idea.decision ? (
                    <span className={`pill ${idea.decision.verdict}`}>Decided: {idea.decision.verdict === "build" ? "Build" : "Nix"}</span>
                  ) : idea.status === "draft" ? (
                    <span className="faint small">Not launched</span>
                  ) : (
                    <VerdictPill verdict={a.verdict} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12 }}><Legend /></div>
    </div>
  );
}
