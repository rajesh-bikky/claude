import Link from "next/link";
import { Logo } from "./logo";
import { Nav } from "./nav";

export default function Home() {
  return (
    <div className="shell">
      <Nav />
      <section style={{ padding: "48px 0 32px", maxWidth: 720 }}>
        <Logo size={72} title="BITNIT" />
        <div className="eyebrow" style={{ marginTop: 16 }}>Build it or Nix it</div>
        <h1 style={{ fontSize: 44, letterSpacing: "-0.03em", margin: "10px 0 14px" }}>
          With AI, building is cheap. Deciding is the hard part.
        </h1>
        <p className="muted" style={{ fontSize: 18, margin: 0 }}>
          BITNIT is an agent that lives inside your product. It picks the users an idea is actually for, asks them one
          structured question, and tells you — with statistical confidence — whether to build it.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <Link className="btn primary" href="/demo">Try it inside Ledgerly →</Link>
          <Link className="btn" href="/admin">Open the builder console</Link>
        </div>
      </section>

      <div className="grid cols-3">
        {[
          ["1 · Target", "Each idea declares who it's for: personas, the features they must already use, tenure. BITNIT scores every user's fit and only asks the ones who match."],
          ["2 · Ask", "What it solves. How it solves it. 🔥 Badly need it today, 🤔 Maybe, or 🤷 Won't use it. Ten seconds, one question per visit."],
          ["3 · Decide", "Wilson confidence intervals against your build bar, persona and power-user splits, and a plain-language Build / Nix / Keep collecting call."],
        ].map(([h, p]) => (
          <div key={h} className="card">
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>{h}</h3>
            <p className="muted small" style={{ margin: 0 }}>{p}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Plug it into any product</h3>
        <pre className="small" style={{ margin: 0, overflowX: "auto", fontFamily: "var(--mono)" }}>{`<script src="https://your-bitnit-host/bitnit.js"></script>
<script>
  BITNIT.init({
    user: {
      id: "u_123", persona: "freelancer", plan: "Pro", tenureDays: 410,
      featureUsage: { invoices: 34, time_tracking: 52 }   // uses in the last 30 days
    }
  });
</script>`}</pre>
      </div>
    </div>
  );
}
