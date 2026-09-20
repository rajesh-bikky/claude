import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";

// Browser recordings (webm/opus or mp4/aac) get normalized to 16kHz mono WAV
// before being sent to Gemini — a format it's guaranteed to handle reliably,
// rather than gambling on it decoding whatever codec the browser produced.
export async function convertToWav(audio: Buffer, mimeType: string): Promise<Buffer> {
  const ffmpegBin: string | null = ffmpegPath;
  if (!ffmpegBin) throw new Error("ffmpeg-static did not resolve a binary path");

  const dir = await mkdtemp(path.join(tmpdir(), "thoughtline-"));
  const ext = mimeType.includes("mp4") ? "m4a" : "webm";
  const inputPath = path.join(dir, `input.${ext}`);
  const outputPath = path.join(dir, "audio.wav");

  try {
    await writeFile(inputPath, audio);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegBin, [
        "-y",
        "-i", inputPath,
        "-ac", "1",
        "-ar", "16000",
        "-f", "wav",
        "-acodec", "pcm_f32le",
        outputPath,
      ]);
      let stderr = "";
      proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
