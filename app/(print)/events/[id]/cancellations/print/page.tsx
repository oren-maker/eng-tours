export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PrintActions from "../../../../orders/[id]/print/print-actions";

function fmtDate(d?: string | null) { if (!d) return "—"; try { return new Date(d).toLocaleDateString("he-IL"); } catch { return "—"; } }
function fmtMoney(n: any) { return "₪" + (Number(n) || 0).toLocaleString("he-IL"); }

export default async function CancellationsPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_price, amount_paid, cancellation_fee_amount, cancellation_fee_percent, created_at, internal_notes, participants(first_name_en, last_name_en, phone, email, passport_number)")
    .eq("event_id", id)
    .eq("status", "cancelled")
    .gt("cancellation_fee_amount", 0)
    .order("created_at", { ascending: false });

  const totalFees = (orders || []).reduce((s, o: any) => s + (Number(o.cancellation_fee_amount) || 0), 0);
  const totalRefund = (orders || []).reduce((s, o: any) => s + Math.max(0, (Number(o.amount_paid) || 0) - (Number(o.cancellation_fee_amount) || 0)), 0);

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: "rtl", padding: "24px", maxWidth: "1100px", margin: "0 auto", color: "#1f2937" }}>
      <PrintActions />
      <style>{`
        @media print { .no-print { display: none !important; } body { margin: 0; } tr { page-break-inside: avoid; } }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: right; vertical-align: top; }
        th { background: #fef3c7; font-weight: 600; }
      `}</style>

      <div style={{ borderBottom: "3px solid #DD9933", paddingBottom: "16px", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, color: "#DD9933", fontSize: "24px" }}>ENG Tours</h1>
        <div style={{ fontSize: "18px", fontWeight: 600, marginTop: "8px" }}>💸 דוח דמי ביטול - {event.name}</div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{fmtDate(event.start_date)} - {fmtDate(event.end_date)} · ID: {event.id}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
        <div style={{ background: "#fed7aa", padding: "12px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#7c2d12" }}>סה״כ הזמנות מבוטלות</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#9a3412" }}>{(orders || []).length}</div>
        </div>
        <div style={{ background: "#bbf7d0", padding: "12px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#14532d" }}>סה״כ דמי ביטול שהתקבלו</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#166534" }}>{fmtMoney(totalFees)}</div>
        </div>
        <div style={{ background: "#bfdbfe", padding: "12px", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", color: "#1e3a8a" }}>סה״כ הוחזר ללקוחות</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e40af" }}>{fmtMoney(totalRefund)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>מס׳ הזמנה</th><th>תאריך</th><th>משתתפים</th><th>טלפון/מייל</th>
            <th>סכום</th><th>שולם</th><th>%</th><th>דמי ביטול</th><th>החזר</th>
          </tr>
        </thead>
        <tbody>
          {(orders || []).map((o: any) => {
            const paid = Number(o.amount_paid) || 0;
            const fee = Number(o.cancellation_fee_amount) || 0;
            const refund = Math.max(0, paid - fee);
            return (
              <tr key={o.id}>
                <td style={{ fontFamily: "monospace", fontSize: "10px" }}>#{o.id.slice(0, 8)}</td>
                <td>{fmtDate(o.created_at)}</td>
                <td style={{ fontSize: "11px" }}>{(o.participants || []).map((p: any) => `${p.first_name_en} ${p.last_name_en}`).join(", ")}</td>
                <td style={{ fontSize: "10px" }} dir="ltr">
                  {(o.participants || []).map((p: any, i: number) => (
                    <div key={i}>{p.phone || "—"} · {p.email || "—"}</div>
                  ))}
                </td>
                <td>{fmtMoney(o.total_price)}</td>
                <td style={{ color: "#059669" }}>{fmtMoney(paid)}</td>
                <td style={{ fontWeight: 600, color: "#ea580c" }}>{o.cancellation_fee_percent || 0}%</td>
                <td style={{ fontWeight: 700, color: "#9a3412" }}>{fmtMoney(fee)}</td>
                <td style={{ color: "#1e40af" }}>{fmtMoney(refund)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot style={{ background: "#fef3c7" }}>
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={7} style={{ textAlign: "right" }}>סה״כ</td>
            <td style={{ color: "#9a3412", fontSize: "13px" }}>{fmtMoney(totalFees)}</td>
            <td style={{ color: "#1e40af" }}>{fmtMoney(totalRefund)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: "30px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", fontSize: "11px", color: "#9ca3af", textAlign: "center" }}>
        ENG Tours · {event.name} · הופק ב-{new Date().toLocaleString("he-IL")}
      </div>
    </div>
  );
}
