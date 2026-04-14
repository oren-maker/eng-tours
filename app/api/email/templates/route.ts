export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { ensureDefaultEmailTemplates } from "@/lib/email-templates";

export async function GET() {
  const supabase = createServiceClient();
  try { await ensureDefaultEmailTemplates(); } catch {}
  const { data, error } = await supabase.from("email_templates").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data || [] });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, name, subject, body_html, variables, is_active } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (subject !== undefined) updates.subject = subject;
  if (body_html !== undefined) updates.body_html = body_html;
  if (variables !== undefined) updates.variables = variables;
  if (is_active !== undefined) updates.is_active = !!is_active;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("email_templates").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
