export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { wasender, isConfigured } from "@/lib/wasender";
import { createServiceClient } from "@/lib/supabase";

function normalizePhone(input: string) {
  let digits = (input || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return "+" + digits;
}

function applyTemplate(body: string, variables: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => variables[k] ?? "");
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isConfigured()) {
      return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { number, message, templateName, variables, sessionId } = body;

    if (!number) return NextResponse.json({ error: "חסר מספר טלפון" }, { status: 400 });

    let text = (message || "").trim();
    if (!text && templateName) {
      const supabase = createServiceClient();
      const { data: tpl } = await supabase
        .from("whatsapp_templates")
        .select("body")
        .eq("name", templateName)
        .single();
      if (tpl?.body) text = applyTemplate(tpl.body, variables || {});
    }

    if (!text) return NextResponse.json({ error: "תוכן ההודעה ריק" }, { status: 400 });

    const to = normalizePhone(number);

    // Find the session to use (first connected session if none specified)
    const sessionsRes = await wasender.listSessions();
    if (!sessionsRes.ok) {
      return NextResponse.json({ success: false, error: sessionsRes.error || "Cannot list sessions" }, { status: 500 });
    }
    const allSessions: any[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : ((sessionsRes.data as any)?.data || []);
    const targetSession = sessionId
      ? allSessions.find((s) => String(s.id) === String(sessionId))
      : allSessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase())) || allSessions[0];

    if (!targetSession) {
      return NextResponse.json({ success: false, error: "אין חשבון WhatsApp מחובר. חבר חשבון תחילה." }, { status: 400 });
    }
    if (!targetSession.api_key) {
      return NextResponse.json({ success: false, error: "לא נמצא API key לסשן" }, { status: 400 });
    }
    if (!["connected", "ready"].includes((targetSession.status || "").toLowerCase())) {
      return NextResponse.json({ success: false, error: `החשבון לא מחובר (סטטוס: ${targetSession.status}). יש לסרוק QR מחדש.` }, { status: 400 });
    }

    const r = await wasender.sendTextWithSessionKey(targetSession.api_key, { to, text });

    const supabase = createServiceClient();
    if (!r.ok) {
      await supabase.from("whatsapp_log").insert({
        direction: "outgoing",
        recipient: to.replace("+", ""),
        message_body: text,
        template_name: templateName || null,
        status: "failed",
        error_message: r.error,
      });
      return NextResponse.json({ success: false, error: r.error }, { status: r.status || 500 });
    }

    await supabase.from("whatsapp_log").insert({
      direction: "outgoing",
      recipient: to.replace("+", ""),
      message_body: text,
      template_name: templateName || null,
      status: "sent",
      external_id: (r.data as any)?.data?.msgId?.toString() || null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
