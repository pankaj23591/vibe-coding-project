import { NextResponse } from "next/server";
import { buildDashboardStats } from "@/lib/aggregate";
import { listCalls } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const calls = await listCalls();
  const stats = buildDashboardStats(calls);
  return NextResponse.json({ stats, calls });
}
