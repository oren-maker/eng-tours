export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("he-IL"); } catch { return ""; }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: event } = await supabase.from("events").select("name, id").eq("id", id).single();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_price, amount_paid, cancellation_fee_amount, cancellation_fee_percent, created_at, internal_notes, participants(first_name_en, last_name_en, phone, email, passport_number)")
    .eq("event_id", id)
    .eq("status", "cancelled")
    .gt("cancellation_fee_amount", 0)
    .order("created_at", { ascending: false });

  const headers = ["מספר הזמנה", "תאריך הזמנה", "משתתפים", "טלפונים", "מיילים", "סכום הזמנה", "שולם", "% דמי ביטול", "דמי ביטול", "החזר ללקוח", "הערות"];
  const rows: string[][] = [];

  let totalFees = 0, totalRefund = 0;
  for (const o of (orders || []) as any[]) {
    const paid = Number(o.amount_paid) || 0;
    const fee = Number(o.cancellation_fee_amount) || 0;
    const refund = Math.max(0, paid - fee);
    totalFees += fee;
    totalRefund += refund;
    const parts = o.participants || [];
    rows.push([
      o.id,
      fmtDate(o.created_at),
      parts.map((p: any) => `${p.first_name_en || ""} ${p.last_name_en || ""}`.trim()).join(" | "),
      parts.map((p: any) => p.phone || "").join(" | "),
      parts.map((p: any) => p.email || "").join(" | "),
      String(o.total_price || 0),
      String(paid),
      `${o.cancellation_fee_percent || 0}%`,
      String(fee),
      String(refund),
      (o.internal_notes || "").replace(/\n/g, " "),
    ]);
  }
  rows.push([]);
  rows.push(["סה״כ", "", "", "", "", "", "", "", String(totalFees), String(totalRefund), ""]);

  const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\r\n");
  const body = "\uFEFF" + csv;
  const filename = `cancellations-${event?.name || id}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/[^\w\-.]/g, "_");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
