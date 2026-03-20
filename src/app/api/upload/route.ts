import { mkdir } from "fs/promises";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { processUploadedAudio } from "@/lib/ai-pipeline";
import { saveCall } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tmpDir = path.join(process.cwd(), ".tmp");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await fs.writeFile(tmpPath, buffer);

  let record;
  try {
    record = await processUploadedAudio({
      tempPath: tmpPath,
      originalFilename: file.name || "recording.webm",
      durationSecHint: 0,
    });
  } catch (e) {
    await fs.unlink(tmpPath).catch(() => undefined);
    const message = e instanceof Error ? e.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  await fs.unlink(tmpPath).catch(() => undefined);

  const publicUploads = path.join(process.cwd(), "public", "uploads");
  await mkdir(publicUploads, { recursive: true });
  const dest = path.join(process.cwd(), "public", record.audioRelativePath);
  await fs.writeFile(dest, buffer);

  await saveCall(record);

  return NextResponse.json({ id: record.id });
}
