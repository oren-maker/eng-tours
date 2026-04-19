export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import { hydratePassportNumbers } from "@/lib/pii-participants";

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה", pending_payment: "ממתין לתשלום", partial: "שולם חלקית",
  completed: "הושלם", supplier_review: "בבדיקת ספק", supplier_approved: "אושר ע\"י ספק",
  confirmed: "אושר סופית", cancelled: "מבוטל",
};

const METHOD_LABELS: Record<string, string> = {
  credit: "כרטיס אשראי", transfer: "העברה בנקאית", cash: "מזומן", check: "צ'ק",
};

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
    .select(`id, status, total_price, amount_paid, created_at, cancellation_fee_amount,
      participants(id, first_name_en, last_name_en, phone, email, passport_number, passport_number_enc, birth_date,
        flights(airline_name, flight_code, origin_iata, dest_iata, departure_time),
        rooms(room_type, check_in, check_out, hotels(name)),
        tickets(name)
      ),
      supplier_confirmations(item_type, confirmation_number, has_issue),
      payments(amount, method, card_last4, confirmation, payment_date)
    `)
    .eq("event_id", id)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const headers = [
    "מספר הזמנה", "תאריך הזמנה", "סטטוס",
    "סכום כולל", "שולם", "נותר לתשלום", "דמי ביטול",
    "מספר משתתפים", "שמות משתתפים", "דרכונים", "תאריכי לידה", "טלפונים", "מיילים",
    "טיסות", "מלונות/חדרים", "כרטיסים",
    "מספרי אישור (ספקים)", "תשלומים (סכום/אמצעי/4 ספרות/אישור)",
  ];

  const rows: string[][] = [];

  for (const o of (orders || []) as any[]) {
    const parts = hydratePassportNumbers(o.participants || []);
    const total = Number(o.total_price) || 0;
    const paid = Number(o.amount_paid) || 0;
    const remaining = Math.max(0, total - paid);

    const names = parts.map((p: any) => `${p.first_name_en || ""} ${p.last_name_en || ""}`.trim()).join(" | ");
    const passports = parts.map((p: any) => p.passport_number || "").join(" | ");
    const births = parts.map((p: any) => fmtDate(p.birth_date)).join(" | ");
    const phones = parts.map((p: any) => p.phone || "").join(" | ");
    const emails = parts.map((p: any) => p.email || "").join(" | ");

    const flights = Array.from(new Set(parts.filter((p: any) => p.flights).map((p: any) =>
      `${p.flights.airline_name || ""} ${p.flights.flight_code || ""} ${p.flights.origin_iata || ""}→${p.flights.dest_iata || ""}`.trim()
    ))).join(" | ");

    const rooms = Array.from(new Set(parts.filter((p: any) => p.rooms).map((p: any) =>
      `${p.rooms.hotels?.name || ""} ${p.rooms.room_type || ""}`.trim()
    ))).join(" | ");

    const tickets = Array.from(new Set(parts.filter((p: any) => p.tickets).map((p: any) =>
      p.tickets.name || ""
    ))).join(" | ");

    const confs = (o.supplier_confirmations || []).map((c: any) => {
      const icon = c.item_type === "flight" ? "✈" : c.item_type === "room" ? "🏨" : "🎫";
      return `${icon}${c.confirmation_number || ""}${c.has_issue ? " ⚠" : ""}`;
    }).join(" | ");

    const pmts = (o.payments || []).map((pm: any) =>
      `₪${Number(pm.amount).toLocaleString("he-IL")} / ${METHOD_LABELS[pm.method] || pm.method || ""} / ${pm.card_last4 ? `****${pm.card_last4}` : ""} / ${pm.confirmation || ""} / ${fmtDate(pm.payment_date)}`
    ).join(" | ");

    rows.push([
      o.id,
      fmtDate(o.created_at),
      STATUS_LABELS[o.status] || o.status,
      String(total),
      String(paid),
      String(remaining),
      o.cancellation_fee_amount ? String(o.cancellation_fee_amount) : "",
      String(parts.length),
      names, passports, births, phones, emails,
      flights, rooms, tickets,
      confs, pmts,
    ]);
  }

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\r\n");

  // Add BOM for Excel UTF-8 detection
  const body = "\uFEFF" + csv;
  const filename = `ENG-Tours-${event?.name || id}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/[^\w\-.]/g, "_");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
