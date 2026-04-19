export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { renderEmailTemplate, isUnsubscribed } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
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
    const result = await sendEmail(email, tpl.subject, tpl.html, {
      template: template_name,
      recipient_type: "marketing",
      prerendered: true,
    });
    if (result.success) sent++;
    else { failed++; errors.push(`${email}: ${result.error || "failed"}`); }
    await new Promise((r) => setTimeout(r, 200));
  }

  await logAction(session?.user?.id ?? null, "marketing_campaign_sent", "email", undefined, null, {
    template_name, consent_only: !!consent_only, total: targetEmails.length, sent, skipped, failed,
  });
  return NextResponse.json({ success: true, total: targetEmails.length, sent, skipped, failed, errors: errors.slice(0, 20) });
}
