import { NextRequest, NextResponse } from "next/server";
import { saveTranscript, saveAudio } from "@/lib/save-entries";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Empty text" }, { status: 400 });
    }
    const result = await saveTranscript(text);
    return NextResponse.json(result);
  }

  const arrayBuffer = await request.arrayBuffer();
  const audio = Buffer.from(arrayBuffer);
  if (audio.byteLength === 0) {
    return NextResponse.json({ error: "Empty recording" }, { status: 400 });
  }

  const result = await saveAudio(audio, contentType || "audio/webm");
  return NextResponse.json(result);
}
