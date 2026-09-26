import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SPINOFF_STATUSES = ["requested", "created"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const data: {
    completed?: boolean;
    dueDate?: Date | null;
    spinoffStatus?: string | null;
    spinoffPath?: string | null;
  } = {};

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

  if ("spinoffStatus" in body) {
    if (body.spinoffStatus === null) {
      data.spinoffStatus = null;
    } else if (
      typeof body.spinoffStatus === "string" &&
      (SPINOFF_STATUSES as readonly string[]).includes(body.spinoffStatus)
    ) {
      data.spinoffStatus = body.spinoffStatus;
    } else {
      return NextResponse.json({ error: "spinoffStatus must be requested, created, or null" }, { status: 400 });
    }
  }

  if ("spinoffPath" in body) {
    data.spinoffPath = body.spinoffPath === null ? null : String(body.spinoffPath);
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
