import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [outstandingTodos, outstandingIdeas] = await Promise.all([
    db.entry.findMany({ where: { category: "todo", completed: false }, select: { label: true } }),
    db.entry.count({ where: { category: "idea", completed: false } }),
  ]);

  const counts = new Map<string, number>();
  for (const { label } of outstandingTodos) {
    const key = label?.trim() || "Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3).map(([label, count]) => ({ label, count }));
  const otherCount = sorted.slice(3).reduce((sum, [, count]) => sum + count, 0);

  return NextResponse.json({
    top,
    otherCount,
    total: outstandingTodos.length,
    ideaCount: outstandingIdeas,
  });
}
