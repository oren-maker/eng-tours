import { createServiceClient } from "@/lib/supabase";
import { embed } from "@/lib/rag/embed";

// Recursive character splitter: prefers paragraph breaks → sentences → words.
// Equivalent of LangChain's RecursiveCharacterTextSplitter for simple Hebrew/English text.
export function splitText(text: string, chunkSize = 500, chunkOverlap = 80): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length <= chunkSize) return cleaned ? [cleaned] : [];

  const seps = ["\n\n", "\n", ". ", " "];
  function recur(s: string): string[] {
    if (s.length <= chunkSize) return [s];
    for (const sep of seps) {
      if (s.includes(sep)) {
        const parts = s.split(sep);
        const chunks: string[] = [];
        let cur = "";
        for (const p of parts) {
          const next = cur ? cur + sep + p : p;
          if (next.length <= chunkSize) cur = next;
          else {
            if (cur) chunks.push(cur);
            cur = p.length > chunkSize ? "" : p;
            if (p.length > chunkSize) chunks.push(...recur(p));
          }
        }
        if (cur) chunks.push(cur);
        return chunks;
      }
    }
    // No separators — hard cut
    const hard: string[] = [];
    for (let i = 0; i < s.length; i += chunkSize) hard.push(s.slice(i, i + chunkSize));
    return hard;
  }

  const raw = recur(cleaned);
  // Apply overlap
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const prefix = i > 0 ? raw[i - 1].slice(-chunkOverlap) : "";
    out.push((prefix ? prefix + " " : "") + raw[i]);
  }
  return out;
}

type SourceRow = {
  source: "faq" | "event" | "legal" | "hotel" | "flight" | "ticket" | "package" | "supplier" | "airline";
  source_id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
};

async function collectSources(): Promise<SourceRow[]> {
  const sb = createServiceClient();
  const rows: SourceRow[] = [];

  const { data: faqs } = await sb.from("faq").select("id, question, answer, is_active").eq("is_active", true).limit(500);
  for (const f of faqs || []) {
    rows.push({
      source: "faq",
      source_id: String(f.id),
      title: f.question,
      content: `שאלה: ${f.question}\nתשובה: ${f.answer}`,
      metadata: {},
    });
  }

  const { data: events } = await sb
    .from("events")
    .select("id, name, description, type_code, destination_country, start_date, end_date, min_age, max_age, mode, status, is_domestic, services")
    .limit(500);
  for (const e of events || []) {
    const parts = [
      `אירוע: ${e.name}`,
      e.type_code ? `סוג: ${e.type_code}` : "",
      e.destination_country ? `יעד: ${e.destination_country}` : "",
      e.is_domestic ? "נסיעת פנים" : "",
      e.start_date ? `תאריך התחלה: ${e.start_date}` : "",
      e.end_date ? `תאריך סיום: ${e.end_date}` : "",
      e.min_age ? `גיל מינימום: ${e.min_age}` : "",
      e.max_age ? `גיל מקסימום: ${e.max_age}` : "",
      e.mode ? `מצב הזמנה: ${e.mode}` : "",
      e.status ? `סטטוס: ${e.status}` : "",
      Array.isArray(e.services) && e.services.length > 0 ? `שירותים כלולים: ${e.services.join(", ")}` : "",
      e.description ? `תיאור: ${e.description}` : "",
    ].filter(Boolean).join("\n");
    rows.push({ source: "event", source_id: String(e.id), title: e.name, content: parts, metadata: { destination: e.destination_country, status: e.status } });
  }

  const { data: legal } = await sb.from("legal_documents").select("slug, title, content").limit(50);
  for (const l of legal || []) {
    rows.push({ source: "legal", source_id: l.slug, title: l.title, content: `${l.title}\n\n${l.content || ""}`, metadata: {} });
  }

  const { data: hotels } = await sb.from("hotels").select("id, name, city, country, stars, rating, contact_name, contact_phone, website").limit(500);
  for (const h of hotels || []) {
    const content = [
      `מלון: ${h.name}`,
      h.city ? `עיר: ${h.city}` : "",
      h.country ? `מדינה: ${h.country}` : "",
      h.stars ? `כוכבים: ${h.stars}` : "",
      h.rating ? `דירוג: ${h.rating}` : "",
      h.contact_name ? `איש קשר: ${h.contact_name}` : "",
      h.contact_phone ? `טלפון: ${h.contact_phone}` : "",
      h.website ? `אתר: ${h.website}` : "",
    ].filter(Boolean).join("\n");
    rows.push({ source: "hotel", source_id: String(h.id), title: h.name, content, metadata: { city: h.city, country: h.country } });
  }

  const { data: flights } = await sb
    .from("flights")
    .select("id, airline_name, flight_code, origin_iata, origin_city, dest_iata, dest_city, departure_time, arrival_time, price_customer, transfer_company, contact_phone")
    .limit(1000);
  for (const f of flights || []) {
    const content = [
      `טיסה: ${f.airline_name || ""} ${f.flight_code || ""}`,
      f.origin_iata && f.dest_iata ? `מסלול: ${f.origin_city || f.origin_iata} → ${f.dest_city || f.dest_iata}` : "",
      f.departure_time ? `יציאה: ${f.departure_time}` : "",
      f.arrival_time ? `הגעה: ${f.arrival_time}` : "",
      f.price_customer ? `מחיר ללקוח: ₪${f.price_customer}` : "",
      f.transfer_company ? `חברת העברה: ${f.transfer_company}` : "",
      f.contact_phone ? `טלפון ספק: ${f.contact_phone}` : "",
    ].filter(Boolean).join("\n");
    rows.push({
      source: "flight",
      source_id: String(f.id),
      title: `${f.airline_name || ""} ${f.flight_code || ""}`.trim() || "טיסה",
      content,
      metadata: { route: `${f.origin_iata || ""}-${f.dest_iata || ""}` },
    });
  }

  const { data: tickets } = await sb.from("tickets").select("id, name, price_customer, event_id, total_qty, booked_qty, payment_type").limit(500);
  for (const t of tickets || []) {
    const content = [
      `כרטיס: ${t.name}`,
      t.price_customer ? `מחיר ללקוח: ₪${t.price_customer}` : "",
      t.payment_type ? `סוג תשלום: ${t.payment_type}` : "",
      t.total_qty ? `כמות כוללת: ${t.total_qty}` : "",
      t.booked_qty != null ? `נמכרו: ${t.booked_qty}` : "",
    ].filter(Boolean).join("\n");
    rows.push({ source: "ticket", source_id: String(t.id), title: t.name, content, metadata: { event_id: t.event_id } });
  }

  const { data: packages } = await sb.from("packages").select("id, name, price_total, service_level, event_id, flight_id, room_id, ticket_id").limit(500);
  for (const p of packages || []) {
    const content = [
      `חבילה: ${p.name}`,
      p.service_level ? `רמת שירות: ${p.service_level}` : "",
      p.price_total ? `מחיר כולל: ₪${p.price_total}` : "",
      p.flight_id ? "כוללת טיסה" : "",
      p.room_id ? "כוללת חדר" : "",
      p.ticket_id ? "כוללת כרטיס" : "",
    ].filter(Boolean).join("\n");
    rows.push({ source: "package", source_id: String(p.id), title: p.name, content, metadata: { event_id: p.event_id } });
  }

  const { data: airlines } = await sb.from("airlines").select("id, name, iata_code, country, contact_name, contact_phone, website, notes").limit(500);
  for (const a of airlines || []) {
    const content = [
      `חברת תעופה: ${a.name}`,
      a.iata_code ? `קוד IATA: ${a.iata_code}` : "",
      a.country ? `מדינה: ${a.country}` : "",
      a.contact_name ? `איש קשר: ${a.contact_name}` : "",
      a.contact_phone ? `טלפון: ${a.contact_phone}` : "",
      a.website ? `אתר: ${a.website}` : "",
      a.notes ? `הערות: ${a.notes}` : "",
    ].filter(Boolean).join("\n");
    rows.push({ source: "airline", source_id: String(a.id), title: a.name, content, metadata: { country: a.country } });
  }

  return rows;
}

export async function ingestAll(opts?: { onProgress?: (done: number, total: number, source?: string) => void }): Promise<{ sources: number; chunks: number; embedded: number; errors: number }> {
  const sb = createServiceClient();
  const sources = await collectSources();

  let totalChunks = 0;
  let embedded = 0;
  let errors = 0;

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const chunks = splitText(s.content, 500, 80);
    for (let ci = 0; ci < chunks.length; ci++) {
      totalChunks++;
      try {
        const vec = await embed(chunks[ci]);
        if (!vec) continue;
        // pgvector via PostgREST expects the embedding as a string formatted "[n1,n2,...]"
        const embeddingLiteral = "[" + vec.join(",") + "]";
        const { error } = await sb.from("rag_documents").upsert({
          source: s.source,
          source_id: s.source_id,
          chunk_index: ci,
          title: s.title,
          content: chunks[ci],
          metadata: s.metadata || {},
          embedding: embeddingLiteral as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: "source,source_id,chunk_index" });
        if (error) { errors++; console.error(`insert ${s.source}/${s.source_id}#${ci}:`, error.message); }
        else embedded++;
      } catch (e: any) {
        errors++;
        console.error(`chunk ${s.source}/${s.source_id}#${ci}:`, e.message);
      }
      opts?.onProgress?.(embedded, totalChunks, s.source);
    }
  }

  return { sources: sources.length, chunks: totalChunks, embedded, errors };
}
