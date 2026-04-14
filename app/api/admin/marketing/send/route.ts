export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { renderEmailTemplate, isUnsubscribed } from "@/lib/email-templates";

export async function POST(request: Request) {
  const body = await request.json();
  const { template_name, consent_only, emails } = body;
  if (!template_name) return NextResponse.json({ error: "חסר שם תבנית" }, { status: 400 });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });

  let targetEmails: string[] = [];
  if (Array.isArray(emails) && emails.length > 0) {
    targetEmails = emails;
  } else {
    // Pull from DB
    const supabase = createServiceClient();
    const { data: participants } = await supabase
      .from("participants")
      .select("email, marketing_consent")
      .not("email", "is", null);
    const set = new Set<string>();
    for (const p of participants || []) {
      const em = (p as any).email?.toLowerCase().trim();
      if (!em) continue;
      if (consent_only && !(p as any).marketing_consent) continue;
      set.add(em);
    }
    targetEmails = Array.from(set);
  }

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const email of targetEmails) {
    if (await isUnsubscribed(email)) { skipped++; continue; }
    const tpl = await renderEmailTemplate(template_name, { email }, email);
    if (!tpl) { skipped++; continue; }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ENG TOURS <onboarding@resend.dev>",
          to: [email],
          subject: tpl.subject,
          html: tpl.html,
        }),
      });
      if (res.ok) sent++;
      else { failed++; const d = await res.json(); errors.push(`${email}: ${d.message || res.status}`); }
      await new Promise((r) => setTimeout(r, 200)); // gentle pacing
    } catch (e: any) {
      failed++;
      errors.push(`${email}: ${e.message}`);
    }
  }

  return NextResponse.json({ success: true, total: targetEmails.length, sent, skipped, failed, errors: errors.slice(0, 20) });
}
