"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CapForm({ initial }: { initial: number }) {
  const router = useRouter();
  const [cap, setCap] = useState(initial);
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <label className="small muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        At most
        <input className="input num" type="number" min={1} max={10} value={cap} style={{ width: 72, padding: "5px 8px" }}
          onChange={(e) => { setCap(Number(e.target.value)); setSaved(false); }} />
        bits per user every 30 days
      </label>
      <button className="btn primary" style={{ padding: "5px 12px" }} disabled={cap === initial && !saved}
        onClick={async () => {
          await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxBitsPer30d: cap }) });
          setSaved(true);
          router.refresh();
        }}>
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
