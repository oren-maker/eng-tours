export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { DEFAULT_TEMPLATES } from "@/lib/wa-templates";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name") || "";
  const tpl = DEFAULT_TEMPLATES[name];
  if (!tpl) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(tpl);
}
