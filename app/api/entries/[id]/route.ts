import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const data: { completed?: boolean; dueDate?: Date | null } = {};

  if ("completed" in body) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }
    data.completed = body.completed;
  }

  if ("dueDate" in body) {
    if (body.dueDate === null) {
      data.dueDate = null;
    } else if (typeof body.dueDate === "string" && DATE_RE.test(body.dueDate)) {
      data.dueDate = new Date(`${body.dueDate}T00:00:00`);
    } else {
      return NextResponse.json({ error: "dueDate must be YYYY-MM-DD or null" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const entry = await db.entry.update({ where: { id }, data });
  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
