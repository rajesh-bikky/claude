import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidWatcherRequest } from "@/lib/watcher-auth";

// Polled by the local spin-off watcher script (scripts/spinoff-watcher.mjs),
// which turns each requested idea into an independent project folder.
// Excluded from the Google-session middleware — see middleware.ts.
export async function GET(request: NextRequest) {
  if (!isValidWatcherRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db.entry.findMany({
    where: { category: "idea", spinoffStatus: "requested" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ entries });
}
