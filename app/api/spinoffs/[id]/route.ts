import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidWatcherRequest } from "@/lib/watcher-auth";

// Watcher-only: marks an idea's spin-off as created, with its local folder
// path. Excluded from the Google-session middleware — see middleware.ts.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isValidWatcherRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const spinoffPath = String(body.spinoffPath ?? "");
  if (!spinoffPath) {
    return NextResponse.json({ error: "spinoffPath is required" }, { status: 400 });
  }

  const entry = await db.entry.update({
    where: { id },
    data: { spinoffStatus: "created", spinoffPath },
  });
  return NextResponse.json({ entry });
}
