import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Polled by the local spin-off watcher script (scripts/spinoff-watcher.mjs),
// which turns each requested idea into an independent project folder.
export async function GET() {
  const entries = await db.entry.findMany({
    where: { category: "idea", spinoffStatus: "requested" },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ entries });
}
