export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resetAllTemplatesToDefault } from "@/lib/wa-templates";

export async function POST() {
  const count = await resetAllTemplatesToDefault();
  return NextResponse.json({ success: true, restored: count });
}
