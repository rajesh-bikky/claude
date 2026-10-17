import { connection } from "next/server";
import { getStore } from "@/lib/store";
import { promptBudget } from "@/lib/targeting";
import { Nav } from "../../nav";
import { CapForm } from "./cap-form";

export default async function Settings() {
  await connection();
  const store = getStore();
  const cap = store.settings.maxBitsPer30d;
  const users = Object.values(store.users);
  const used = users.map((u) => promptBudget(u.id, store).used);
  const atCap = used.filter((n) => n >= cap).length;
  const asked = used.filter((n) => n > 0).length;

  return (
    <div className="shell">
      <Nav />
      <h1 style={{ fontSize: 30, letterSpacing: "-0.02em", margin: "12px 0 20px" }}>Settings</h1>
      <section className="card grid cols-2" style={{ alignItems: "start", gap: 24 }}>
        <div className="grid" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 16 }}>Frequency cap</h2>
          <p className="small muted" style={{ margin: 0 }}>
            The most bits one user is asked about in any 30 days. A bit counts once however often its card reappears;
            dismissing still counts. When a user hits the cap, BITNIT stays quiet until older questions age out.
          </p>
          <CapForm initial={cap} />
        </div>
        <div className="grid" style={{ gap: 6 }}>
          <div className="eyebrow">Last 30 days</div>
          <div><strong className="num">{asked}</strong> <span className="muted">of {users.length} users were asked at least once</span></div>
          <div><strong className="num">{atCap}</strong> <span className="muted">are at the cap right now</span></div>
          <div className="small faint">Lower the cap to protect the experience; raise it if bits are waiting too long for answers.</div>
        </div>
      </section>
    </div>
  );
}
