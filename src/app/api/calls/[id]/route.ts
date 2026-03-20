import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { deleteCall, getCall } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safePublicUploadsFile(audioRelativePath: string): string | null {
  const normalized = audioRelativePath.replace(/\\/g, "/");
  if (!normalized.startsWith("uploads/") || normalized.includes("..")) {
    return null;
  }
  const abs = path.resolve(process.cwd(), "public", normalized);
  const root = path.resolve(process.cwd(), "public", "uploads");
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return null;
  }
  return abs;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const call = await getCall(id);
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(call);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!id || /[\\/]/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const call = await getCall(id);
  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const audioAbs = safePublicUploadsFile(call.audioRelativePath);
  const removed = await deleteCall(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (audioAbs) {
    await fs.unlink(audioAbs).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
