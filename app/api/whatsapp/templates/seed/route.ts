export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureDefaultTemplates } from "@/lib/wa-templates";

export async function POST() {
  const added = await ensureDefaultTemplates();
  return NextResponse.json({ success: true, added });
}
