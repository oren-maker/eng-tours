export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resetAllEmailTemplatesToDefault } from "@/lib/email-templates";

export async function POST() {
  const count = await resetAllEmailTemplatesToDefault();
  return NextResponse.json({ success: true, restored: count });
}
