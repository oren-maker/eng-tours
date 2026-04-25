export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { wasender, isConfigured } from "@/lib/wasender";

function normalizePhone(input: string) {
  let digits = (input || "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return "+" + digits;
}

export const DEFAULT_WA_TEMPLATE = `שלום {{first_name}},

תודה שהתעניינת ברכישת כרטיס לאירוע {{title}}!

ניתן לרכוש את הכרטיס בקישור הבא:
{{ticket_link}}

נתראה באירוע 🎉`;

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
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
  if (!["package_inquiry", "ticket_purchase"].includes(interestType)) {
    return NextResponse.json({ error: "בחר סוג עניין" }, { status: 400 });
  }

  const phone = normalizePhone(phoneRaw);
  if (!phone) return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("marketing_pages")
    .select("id, title, is_active, ticket_purchase_link, wa_message_template")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (!page.is_active) return NextResponse.json({ error: "Page disabled" }, { status: 410 });

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
      const r = await sendTicketWhatsapp(phone, text);
      const updates: Record<string, unknown> = r.ok
        ? { whatsapp_status: "sent", whatsapp_sent_at: new Date().toISOString() }
        : { whatsapp_status: "failed", whatsapp_error: (r.error || "").slice(0, 500) };
      await supabase.from("marketing_leads").update(updates).eq("id", lead.id);

      // Mirror to existing whatsapp_log so it shows up in the WA inbox/audit
      await supabase.from("whatsapp_log").insert({
        direction: "outgoing",
        recipient: phone.replace("+", ""),
        message_body: r.text || "",
        template_name: "marketing_ticket_link",
        status: r.ok ? "sent" : "failed",
        error_message: r.ok ? null : (r.error || null),
        external_id: r.msgId || null,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    interest_type: interestType,
    whatsapp_will_send: interestType === "ticket_purchase",
  });
}
