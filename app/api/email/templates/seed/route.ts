export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureDefaultEmailTemplates } from "@/lib/email-templates";

export async function POST() {
  const added = await ensureDefaultEmailTemplates();
  return NextResponse.json({ success: true, added });
}
