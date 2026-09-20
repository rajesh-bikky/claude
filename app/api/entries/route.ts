import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { effectiveDateKey } from "@/lib/dates";

function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(`${day}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// An entry's "effective date" is its dueDate if set, else its createdAt day —
// this matches the same fallback used when displaying/grouping entries.
function effectiveDateBetween(start: Date, end: Date): Prisma.EntryWhereInput {
  return {
    OR: [
      { dueDate: { gte: start, lt: end } },
      { AND: [{ dueDate: null }, { createdAt: { gte: start, lt: end } }] },
    ],
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const month = params.get("month"); // "YYYY-MM" -> returns { counts }

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const rows = await db.entry.findMany({
      where: effectiveDateBetween(start, end),
      select: { dueDate: true, createdAt: true },
    });
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const key = effectiveDateKey(row);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return NextResponse.json({ counts });
  }

  const day = params.get("day");
  const search = params.get("search")?.trim();
  const category = params.get("category");
  const label = params.get("label");
  const recent = params.get("recent");

  const and: Prisma.EntryWhereInput[] = [];
  if (day) {
    const { start, end } = dayBounds(day);
    and.push(effectiveDateBetween(start, end));
  }
  if (category) and.push({ category });
  if (label) and.push({ label });
  if (search) {
    and.push({ OR: [{ text: { contains: search } }, { label: { contains: search } }] });
  }

  const entries = await db.entry.findMany({
    where: and.length > 0 ? { AND: and } : {},
    orderBy: { createdAt: "desc" },
    take: recent ? Number(recent) : 100,
  });

  const labelRows = await db.entry.findMany({
    where: { category: "todo", label: { not: null } },
    distinct: ["label"],
    select: { label: true },
  });
  const labels = labelRows.map((r) => r.label).filter((l): l is string => Boolean(l));

  return NextResponse.json({ entries, labels });
}
