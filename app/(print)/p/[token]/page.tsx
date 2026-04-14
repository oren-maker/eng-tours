export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PrintActions from "../../orders/[id]/print/print-actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  pending_payment: "ממתין לתשלום",
  partial: "שולם חלקית",
  completed: "הושלם",
  supplier_review: "בבדיקת ספק",
  supplier_approved: "אושר ע״י ספק",
  confirmed: "אושר סופית",
  cancelled: "מבוטל",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("he-IL"); } catch { return "—"; }
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("he-IL"); } catch { return "—"; }
}
function fmtMoney(n: any) {
  return "₪" + (Number(n) || 0).toLocaleString("he-IL");
}

export default async function OrderPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, events(name, start_date, end_date, destination_country)")
    .eq("share_token", token)
    .single();
  if (!order) notFound();
  const id = order.id;

  const { data: participants } = await supabase
    .from("participants")
    .select(`*,
      flights(airline_name, flight_code, origin_iata, dest_iata, departure_time),
      rooms(room_type, check_in, check_out, hotels(name)),
      tickets(name)
    `)
    .eq("order_id", id);

  const { data: confirmations } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", id);

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", id)
    .order("created_at");

  const total = Number(order.total_price) || 0;
  const paid = Number(order.amount_paid) || 0;
  const remaining = total - paid;
  const methodLabels: Record<string, string> = { credit: "כרטיס אשראי", transfer: "העברה בנקאית", cash: "מזומן", check: "צ'ק" };

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: "rtl", padding: "24px", maxWidth: "900px", margin: "0 auto", color: "#1f2937" }}>
      <PrintActions />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-size: 13px; }
        th { background: #f9fafb; font-weight: 600; }
      `}</style>

      <div style={{ borderBottom: "3px solid #DD9933", paddingBottom: "16px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, color: "#DD9933", fontSize: "28px" }}>ENG TOURS</h1>
        <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>אישור הזמנה</div>
      </div>

      <table style={{ marginBottom: "20px" }}>
        <tbody>
          <tr><th style={{ width: "140px" }}>מספר הזמנה</th><td style={{ fontFamily: "monospace" }}>{order.id}</td></tr>
          <tr><th>אירוע</th><td>{(order.events as any)?.name || "—"}{(order.events as any)?.destination_country ? ` · ${(order.events as any).destination_country}` : ""}</td></tr>
          <tr><th>תאריכים</th><td>{fmtDate((order.events as any)?.start_date)} - {fmtDate((order.events as any)?.end_date)}</td></tr>
          <tr><th>סטטוס</th><td>{STATUS_LABELS[order.status] || order.status}</td></tr>
          <tr><th>תאריך הזמנה</th><td>{fmtDateTime(order.created_at)}</td></tr>
          <tr><th>סכום כולל</th><td style={{ fontWeight: 600 }}>{fmtMoney(total)}</td></tr>
          <tr><th>שולם</th><td style={{ color: "#059669", fontWeight: 600 }}>{fmtMoney(paid)}</td></tr>
          {remaining > 0 && (
            <tr><th>נותר לתשלום</th><td style={{ color: "#DC2626", fontWeight: 600 }}>{fmtMoney(remaining)}</td></tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "10px" }}>משתתפים ({participants?.length || 0})</h2>
      <table>
        <thead>
          <tr>
            <th>#</th><th>שם</th><th>סוג תעודה</th><th>לידה</th><th>טלפון</th><th>מייל</th>
          </tr>
        </thead>
        <tbody>
          {(participants || []).map((p: any, i: number) => {
            const docLabels: Record<string, string> = { passport: "דרכון", id_card: "תעודת זהות", drivers_license: "רישיון נהיגה" };
            const docLabel = docLabels[p.document_type] || "דרכון";
            return (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{p.first_name_en} {p.last_name_en}</td>
                <td>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>{docLabel}</div>
                  <div style={{ fontFamily: "monospace" }}>{p.passport_number || "—"}</div>
                </td>
                <td>{fmtDate(p.birth_date)}</td>
                <td dir="ltr" style={{ textAlign: "right" }}>{p.phone || "—"}</td>
                <td dir="ltr" style={{ textAlign: "right" }}>{p.email || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "10px" }}>פרטי שירותים</h2>
      <table>
        <thead>
          <tr><th>משתתף</th><th>✈ טיסה</th><th>🏨 חדר</th><th>🎫 כרטיס</th></tr>
        </thead>
        <tbody>
          {(participants || []).map((p: any) => (
            <tr key={p.id}>
              <td>{p.first_name_en} {p.last_name_en}</td>
              <td>{p.flights ? `${p.flights.airline_name || ""} ${p.flights.flight_code || ""} · ${p.flights.origin_iata || ""}→${p.flights.dest_iata || ""}` : "—"}</td>
              <td>{p.rooms ? `${p.rooms.hotels?.name || ""} · ${p.rooms.room_type || ""}` : "—"}</td>
              <td>{p.tickets?.name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {confirmations && confirmations.length > 0 && (
        <>
          <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "10px" }}>אישורי ספקים</h2>
          <table>
            <thead>
              <tr><th>פריט</th><th>מספר אישור</th><th>הערות</th><th>סטטוס</th></tr>
            </thead>
            <tbody>
              {confirmations.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.item_type === "flight" ? "✈ טיסה" : c.item_type === "room" ? "🏨 חדר" : "🎫 כרטיס"}</td>
                  <td style={{ fontFamily: "monospace" }}>{c.confirmation_number || "—"}</td>
                  <td>{c.notes || "—"}</td>
                  <td>{c.has_issue ? "⚠ בעיה" : "✓ אושר"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {payments && payments.length > 0 && (
        <>
          <h2 style={{ fontSize: "18px", marginTop: "24px", marginBottom: "10px" }}>תשלומים</h2>
          <table>
            <thead>
              <tr><th>תאריך</th><th>סכום</th><th>אמצעי</th><th>4 ספרות</th><th>אישור עסקה</th></tr>
            </thead>
            <tbody>
              {payments.map((pm: any) => (
                <tr key={pm.id}>
                  <td>{fmtDate(pm.payment_date) || fmtDate(pm.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{fmtMoney(pm.amount)}</td>
                  <td>{methodLabels[pm.method] || pm.method || "—"}</td>
                  <td style={{ fontFamily: "monospace" }} dir="ltr">{pm.card_last4 ? `**** ${pm.card_last4}` : "—"}</td>
                  <td style={{ fontFamily: "monospace" }} dir="ltr">{pm.confirmation || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
        ENG TOURS · מערכת ניהול אירועים · הופק ב-{fmtDateTime(new Date().toISOString())}
      </div>
    </div>
  );
}
