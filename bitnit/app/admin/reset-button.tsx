"use client";

import { useRouter } from "next/navigation";

export function ResetButton() {
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        if (!confirm("Reset to the sample data? Ideas and answers you added will be lost.")) return;
        await fetch("/api/admin/reset", { method: "POST" });
        router.refresh();
      }}
    >
      Reset sample data
    </button>
  );
}
