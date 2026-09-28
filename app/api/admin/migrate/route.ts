import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-time setup endpoint: creates the Entry table on a fresh database
// (Turso in production). Safe to call more than once — it checks first and
// no-ops if the table already exists. Remove once the production database
// has been initialized.
export async function POST() {
  const existing = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='Entry'`,
  );
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, alreadyMigrated: true });
  }

  await db.$executeRawUnsafe(`
    CREATE TABLE "Entry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "label" TEXT,
      "completed" BOOLEAN NOT NULL DEFAULT false,
      "dueDate" DATETIME,
      "spinoffStatus" TEXT,
      "spinoffPath" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.$executeRawUnsafe(`CREATE INDEX "Entry_createdAt_idx" ON "Entry"("createdAt")`);
  await db.$executeRawUnsafe(`CREATE INDEX "Entry_dueDate_idx" ON "Entry"("dueDate")`);
  await db.$executeRawUnsafe(`CREATE INDEX "Entry_category_idx" ON "Entry"("category")`);

  return NextResponse.json({ ok: true, alreadyMigrated: false });
}
