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
    const r = await wasender.sendText({ to, text, sessionId });

    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: r.status || 500 });
    }

    // Log to whatsapp_log
    const supabase = createServiceClient();
    await supabase.from("whatsapp_log").insert({
      direction: "outgoing",
      recipient: to.replace("+", ""),
      message_body: text,
      template_name: templateName || null,
      status: "sent",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WhatsApp send error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
