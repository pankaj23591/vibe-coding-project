import { readFile } from "fs/promises";
import path from "path";
import { parseBuffer } from "music-metadata";

const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wave": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
};

/** Best-effort duration from file headers (mp3, wav, m4a, ogg, webm when supported). */
export async function getAudioDurationSec(audioPath: string): Promise<number | null> {
  try {
    const ext = path.extname(audioPath).toLowerCase();
    const mime = EXT_TO_MIME[ext] ?? "audio/mpeg";
    const buf = await readFile(audioPath);
    const meta = await parseBuffer(Uint8Array.from(buf), mime);
    const d = meta.format.duration;
    if (typeof d === "number" && Number.isFinite(d) && d > 0.2 && d < 86400) {
      return Math.round(d);
    }
  } catch {
    // unsupported or corrupt
  }
  return null;
}

export function estimateDurationFromFileSizeBytes(sizeBytes: number): number {
  const raw = Math.round(sizeBytes / 12000);
  return Math.max(1, Math.min(7200, raw));
}
