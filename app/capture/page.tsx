"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Status = "idle" | "requesting" | "recording" | "typing" | "processing" | "done" | "error";

export default function CapturePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [typedText, setTypedText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const uploadRecording = useCallback(async (blob: Blob) => {
    setStatus("processing");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      pendingBlobRef.current = null;
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch (err) {
      console.error(err);
      setErrorMessage("Couldn't save that recording. Your audio is kept — try again.");
      setStatus("error");
    }
  }, []);

  const uploadText = useCallback(async (text: string) => {
    setStatus("processing");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      pendingTextRef.current = null;
      setTypedText("");
      setStatus("done");
      setTimeout(() => setStatus("idle"), 1600);
    } catch (err) {
      console.error(err);
      setErrorMessage("Couldn't save that. Your text is kept — try again.");
      setStatus("error");
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        pendingBlobRef.current = blob;
        stopStream();
        void uploadRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      setStatus("recording");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Couldn't access the microphone. Check that this site has mic permission.",
      );
      setStatus("error");
    }
  }, [stopStream, uploadRecording]);

  const endRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const openTyping = useCallback(() => {
    mediaRecorderRef.current?.stop();
    stopStream();
    setErrorMessage(null);
    setStatus("typing");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [stopStream]);

  const submitTyped = useCallback(() => {
    const text = typedText.trim();
    if (!text) return;
    pendingTextRef.current = text;
    void uploadText(text);
  }, [typedText, uploadText]);

  const retry = useCallback(() => {
    if (pendingBlobRef.current) {
      void uploadRecording(pendingBlobRef.current);
    } else if (pendingTextRef.current) {
      void uploadText(pendingTextRef.current);
    } else {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, [uploadRecording, uploadText]);

  useEffect(() => stopStream, [stopStream]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");

  const canLeave = status === "idle" || status === "typing" || status === "done" || status === "error";

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-canvas px-6">
      <div
        className="gradient-orb absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2"
        style={{ ["--orb-color" as string]: "var(--color-gradient-lavender)" }}
      />

      {canLeave && (
        <Link
          href="/browse"
          className="absolute left-5 top-5 z-20 flex items-center gap-1 text-[14px] text-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Calendar
        </Link>
      )}

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-10 text-center">
        {status === "idle" && (
          <>
            <h1 className="font-display text-3xl text-ink">Ready when you are</h1>
            <button
              onClick={startRecording}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition active:bg-primary-active"
              aria-label="Start recording"
            >
              <MicIcon />
            </button>
            <button onClick={openTyping} className="text-[14px] text-muted underline">
              Type instead
            </button>
          </>
        )}

        {status === "requesting" && (
          <p className="text-[15px] text-body">Asking for microphone access…</p>
        )}

        {status === "recording" && (
          <>
            <div className="flex items-end gap-1.5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 animate-[pulse-bar_1s_ease-in-out_infinite] rounded-full bg-ink"
                  style={{
                    height: 24,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
            <p className="font-display text-2xl text-ink">
              {minutes}:{seconds}
            </p>
            <button
              onClick={endRecording}
              className="h-14 rounded-pill bg-primary px-8 text-[15px] font-medium text-on-primary transition active:bg-primary-active"
            >
              End Recording
            </button>
            <button onClick={openTyping} className="text-[14px] text-muted underline">
              Type instead
            </button>
          </>
        )}

        {status === "typing" && (
          <>
            <h1 className="font-display text-2xl text-ink">Type or dictate</h1>
            <textarea
              ref={textareaRef}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your to-dos, ideas, or thoughts… (use your keyboard's mic for voice typing)"
              rows={6}
              className="w-full rounded-md border border-hairline-strong bg-surface-card p-4 text-[15px] text-ink outline-none focus:border-2 focus:border-ink"
            />
            <div className="flex w-full gap-3">
              <button
                onClick={() => {
                  setTypedText("");
                  setStatus("idle");
                }}
                className="h-11 flex-1 rounded-pill border border-hairline-strong text-[15px] font-medium text-ink"
              >
                Cancel
              </button>
              <button
                onClick={submitTyped}
                disabled={!typedText.trim()}
                className="h-11 flex-1 rounded-pill bg-primary text-[15px] font-medium text-on-primary transition active:bg-primary-active disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </>
        )}

        {status === "processing" && (
          <p className="text-[15px] text-body">Saving…</p>
        )}

        {status === "done" && (
          <p className="font-display text-2xl text-ink">Saved ✓</p>
        )}

        {status === "error" && (
          <>
            <p className="max-w-xs text-[15px] text-error">{errorMessage}</p>
            <button
              onClick={retry}
              className="h-10 rounded-pill border border-hairline-strong px-5 text-[15px] font-medium text-ink"
            >
              Try again
            </button>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse-bar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.6); }
        }
      `}</style>
    </main>
  );
}

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
        fill="currentColor"
      />
      <path
        d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z"
        fill="currentColor"
      />
    </svg>
  );
}
