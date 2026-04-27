export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { wasender, isConfigured } from "@/lib/wasender";
import { DEFAULT_WA_TEMPLATE, renderTemplate } from "@/lib/marketing-wa";
import { sendEmail } from "@/lib/email";
import { queueAdminLeadAlert, drainOneDueAdminAlert, formatLeadAlertText } from "@/lib/admin-notify";

function normalizePhone(input: string) {
  let digits = (input || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return "+" + digits;
}

async function sendTicketEmail(to: string, firstName: string, eventTitle: string, link: string | null) {
  if (!link) return { ok: false, error: "אין קישור רכישה מוגדר" };
  const subject = `הקישור לרכישת כרטיס לאירוע ${eventTitle}`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; padding: 8px 0;">
      <h2 style="color:#0f172a; margin:0 0 12px;">שלום ${firstName} 👋</h2>
      <p style="color:#334155; line-height:1.6; margin:0 0 16px;">
        תודה שהתעניינת ברכישת כרטיס לאירוע <b>${eventTitle}</b>!<br/>
        ניתן לרכוש את הכרטיס בקישור הבא:
      </p>
      <p style="margin: 18px 0;">
        <a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">רכוש כרטיס ←</a>
      </p>
      <p style="color:#64748b; font-size:13px; margin: 24px 0 0;">או העתק את הקישור הזה: <br/>
        <a href="${link}" style="color:#475569; word-break:break-all;">${link}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0; margin: 28px 0 16px;" />
      <p style="color:#94a3b8; font-size:12px; margin:0;">נתראה באירוע 🎉</p>
    </div>`;
  const r = await sendEmail(to, subject, html, { template: "marketing_ticket_link", recipient_type: "marketing" });
  return { ok: r.success, error: r.error };
}

async function sendTicketWhatsapp(to: string, text: string) {
  if (!isConfigured()) return { ok: false, error: "WaSender not configured" };
  const sessionsRes = await wasender.listSessions();
  if (!sessionsRes.ok) return { ok: false, error: sessionsRes.error || "Cannot list sessions" };
  const all: any[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : ((sessionsRes.data as any)?.data || []);
  const session = all.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase())) || all[0];
  if (!session?.api_key) return { ok: false, error: "אין סשן WhatsApp מחובר" };
  const r = await wasender.sendTextWithSessionKey(session.api_key, { to, text });
  return { ok: r.ok, error: r.error, msgId: ((r as any)?.data as any)?.data?.msgId?.toString() || null, text };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`lead:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסה שוב בעוד דקה" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim();
  const firstName = String(body.first_name || "").trim().slice(0, 100);
  const lastName = String(body.last_name || "").trim().slice(0, 100);
  const phoneRaw = String(body.phone || "").trim().slice(0, 50);
  const email = String(body.email || "").trim().slice(0, 200);
  const interestType = String(body.interest_type || "").trim();
  const affiliateCode = String(body.affiliate_code || "").trim().slice(0, 32) || null;
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  if (!firstName || !lastName) return NextResponse.json({ error: "שם מלא חובה" }, { status: 400 });
  if (!phoneRaw) return NextResponse.json({ error: "טלפון חובה" }, { status: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "מייל לא תקין" }, { status: 400 });
  if (!interestType) {
    return NextResponse.json({ error: "בחר סוג עניין" }, { status: 400 });
  }

  const phone = normalizePhone(phoneRaw);
  if (!phone) return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("marketing_pages")
    .select("id, title, is_active, ticket_purchase_link, wa_message_template, notification_phone, interest_options")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (!page.is_active) return NextResponse.json({ error: "Page disabled" }, { status: 410 });

  const allowedInterests: string[] = Array.isArray(page.interest_options) && page.interest_options.length
    ? page.interest_options.map((o: { value: string }) => o.value)
    : ["package_inquiry", "ticket_purchase"];
  if (!allowedInterests.includes(interestType)) {
    return NextResponse.json({ error: "סוג עניין לא חוקי לעמוד זה" }, { status: 400 });
  }

  let affiliateId: string | null = null;
  if (affiliateCode) {
    const { data: aff } = await supabase
      .from("marketing_affiliates")
      .select("id")
      .eq("tracking_code", affiliateCode)
      .eq("page_id", page.id)
      .maybeSingle();
    if (aff) affiliateId = aff.id;
  }

  const ua = request.headers.get("user-agent")?.slice(0, 300) || null;

  const initialWaStatus = interestType === "ticket_purchase" ? "pending" : "not_required";

  const { data: lead, error } = await supabase
    .from("marketing_leads")
    .insert({
      page_id: page.id,
      affiliate_id: affiliateId,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      phone,
      email,
      interest_type: interestType,
      whatsapp_status: initialWaStatus,
      payload,
      ip,
      user_agent: ua,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send WA + email only when the interest is the canonical "ticket_purchase".
  // Other custom interests (e.g. "vip", "info_only") still save the lead and
  // notify admin, but don't auto-respond.
  if (interestType === "ticket_purchase") {
    if (!page.ticket_purchase_link) {
      await supabase
        .from("marketing_leads")
        .update({ whatsapp_status: "failed", whatsapp_error: "אין קישור רכישה מוגדר לעמוד" })
        .eq("id", lead.id);
    } else {
      const tpl = (page.wa_message_template && page.wa_message_template.trim()) || DEFAULT_WA_TEMPLATE;
      const text = renderTemplate(tpl, {
        first_name: firstName,
        last_name: lastName,
        title: page.title || "",
        ticket_link: page.ticket_purchase_link || "",
      });

      const [waRes, emailRes] = await Promise.all([
        sendTicketWhatsapp(phone, text),
        sendTicketEmail(email, firstName, page.title || "", page.ticket_purchase_link),
      ]);

      const updates: Record<string, unknown> = {
        ...(waRes.ok
          ? { whatsapp_status: "sent", whatsapp_sent_at: new Date().toISOString() }
          : { whatsapp_status: "failed", whatsapp_error: (waRes.error || "").slice(0, 500) }),
        ...(emailRes.ok
          ? { email_status: "sent", email_sent_at: new Date().toISOString() }
          : { email_status: "failed", email_error: (emailRes.error || "").slice(0, 500) }),
      };
      await supabase.from("marketing_leads").update(updates).eq("id", lead.id);

      // Mirror WA to whatsapp_log
      await supabase.from("whatsapp_log").insert({
        direction: "outgoing",
        recipient: phone.replace("+", ""),
        message_body: waRes.text || "",
        template_name: "marketing_ticket_link",
        status: waRes.ok ? "sent" : "failed",
        error_message: waRes.ok ? null : (waRes.error || null),
        external_id: waRes.msgId || null,
      });
    }
  }

  // Admin lead alert — queued with 10s spacing per WA policy.
  if (page.notification_phone) {
    let affName: string | null = null;
    if (affiliateId) {
      const { data: aff } = await supabase
        .from("marketing_affiliates")
        .select("name")
        .eq("id", affiliateId)
        .maybeSingle();
      affName = aff?.name || null;
    }
    const alertText = formatLeadAlertText({
      pageTitle: page.title || "",
      firstName,
      lastName,
      phone,
      email,
      interestType,
      affiliateName: affName,
    });
    await queueAdminLeadAlert({ recipient: page.notification_phone, text: alertText });
    // Best-effort fire if no backlog exists; otherwise cron picks it up.
    drainOneDueAdminAlert().catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    interest_type: interestType,
    whatsapp_will_send: interestType === "ticket_purchase",
  });
}
