export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PrintActions from "../../../orders/[id]/print/print-actions";
// (print-actions kept in old location for sharing)

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה", pending_payment: "ממתין", partial: "חלקי",
  completed: "הושלם", supplier_review: "בבדיקה", supplier_approved: "אושר ספק",
  confirmed: "אושר", cancelled: "מבוטל",
};

function fmtDate(d?: string | null) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("he-IL"); } catch { return "—"; } }
function fmtMoney(n: any) { return "₪" + (Number(n) || 0).toLocaleString("he-IL"); }

export default async function EventPrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ orders?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const orderFilter = (sp.orders || "").split(",").filter(Boolean);

  const supabase = createServiceClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  let orderQuery = supabase
    .from("orders")
    .select(`id, status, total_price, amount_paid, created_at,
      participants(id, first_name_en, last_name_en, phone, email, passport_number,
        flights(airline_name, flight_code, origin_iata, dest_iata),
        rooms(room_type, hotels(name)),
        tickets(name)
      ),
      supplier_confirmations(item_type, confirmation_number)
    `)
    .eq("event_id", id)
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  if (orderFilter.length > 0) orderQuery = orderQuery.in("id", orderFilter);
  const { data: orders } = await orderQuery;

  const totalRevenue = (orders || []).reduce((s, o: any) => s + (Number(o.total_price) || 0), 0);
  const totalPaid = (orders || []).reduce((s, o: any) => s + (Number(o.amount_paid) || 0), 0);
  const totalParticipants = (orders || []).reduce((s, o: any) => s + ((o.participants || []).length), 0);

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: "rtl", padding: "24px", maxWidth: "1200px", margin: "0 auto", color: "#1f2937" }}>
      <PrintActions />
      <style>{`
        @media print { .no-print { display: none !important; } body { margin: 0; } tr { page-break-inside: avoid; } }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: right; vertical-align: top; }
        th { background: #f9fafb; font-weight: 600; font-size: 11px; }
      `}</style>

      <div style={{ borderBottom: "3px solid #DD9933", paddingBottom: "16px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, color: "#DD9933", fontSize: "26px" }}>ENG TOURS</h1>
        <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "8px" }}>{event.name}</div>
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          {event.destination_country || ""} · {fmtDate(event.start_date)} - {fmtDate(event.end_date)} · ID: {event.id}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
        <div style={{ background: "#f0f9ff", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>סה״כ הזמנות</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{(orders || []).length}</div>
        </div>
        <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>משתתפים</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{totalParticipants}</div>
        </div>
        <div style={{ background: "#fef3c7", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>הכנסות</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{fmtMoney(totalRevenue)}</div>
        </div>
        <div style={{ background: "#d1fae5", padding: "10px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>שולם</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{fmtMoney(totalPaid)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: "16px", marginBottom: "10px" }}>רוכשים ({(orders || []).length} הזמנות)</h2>
      <table>
        <thead>
          <tr>
            <th>מס׳ הזמנה</th>
            <th>תאריך</th>
            <th>סטטוס</th>
            <th>סכום</th>
            <th>שולם</th>
            <th>משתתפים</th>
            <th>טלפונים / מיילים</th>
            <th>שירותים</th>
            <th>מס׳ אישור</th>
          </tr>
        </thead>
        <tbody>
          {(orders || []).map((o: any) => {
            const confs = (o.supplier_confirmations || []).map((c: any) => `${c.item_type === "flight" ? "✈" : c.item_type === "room" ? "🏨" : "🎫"}${c.confirmation_number || "—"}`).join(" · ");
            const services = new Set<string>();
            (o.participants || []).forEach((p: any) => {
              if (p.flights) services.add(`✈ ${p.flights.airline_name || ""} ${p.flights.flight_code || ""}`);
              if (p.rooms) services.add(`🏨 ${p.rooms.hotels?.name || ""} ${p.rooms.room_type || ""}`);
              if (p.tickets) services.add(`🎫 ${p.tickets.name || ""}`);
            });
            return (
              <tr key={o.id}>
                <td style={{ fontFamily: "monospace" }}>{o.id.slice(0, 8)}</td>
                <td>{fmtDate(o.created_at)}</td>
                <td>{STATUS_LABELS[o.status] || o.status}</td>
                <td>{fmtMoney(o.total_price)}</td>
                <td style={{ color: Number(o.amount_paid) < Number(o.total_price) ? "#DC2626" : "#059669" }}>{fmtMoney(o.amount_paid)}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{(o.participants || []).length} איש</div>
                  {(o.participants || []).map((p: any) => (
                    <div key={p.id} style={{ fontSize: "10px" }}>
                      {p.first_name_en} {p.last_name_en}
                      {p.passport_number && <span style={{ color: "#6b7280" }}> · {p.passport_number}</span>}
                    </div>
                  ))}
                </td>
                <td dir="ltr" style={{ textAlign: "right", fontSize: "10px" }}>
                  {(o.participants || []).map((p: any) => (
                    <div key={p.id}>
                      {p.phone} · {p.email}
                    </div>
                  ))}
                </td>
                <td style={{ fontSize: "10px" }}>
                  {Array.from(services).map((s, i) => <div key={i}>{s}</div>)}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "10px" }}>{confs || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: "30px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
        ENG TOURS · {event.name} · הופק ב-{new Date().toLocaleString("he-IL")}
      </div>
    </div>
  );
}
