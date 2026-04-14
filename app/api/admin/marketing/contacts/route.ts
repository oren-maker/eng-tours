export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface Contact {
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  marketing_consent: boolean;
  source: string;
  last_order_at: string | null;
}

function detectCountry(phone: string | null): string | null {
  if (!phone) return null;
  const p = phone.replace(/[^0-9+]/g, "");
  if (p.startsWith("+972") || p.startsWith("972")) return "ישראל";
  if (p.startsWith("+1") || p.startsWith("1")) return "ארה\"ב / קנדה";
  if (p.startsWith("+44")) return "בריטניה";
  if (p.startsWith("+33")) return "צרפת";
  if (p.startsWith("+49")) return "גרמניה";
  if (p.startsWith("+39")) return "איטליה";
  if (p.startsWith("+34")) return "ספרד";
  if (p.startsWith("+30")) return "יוון";
  if (p.startsWith("+31")) return "הולנד";
  if (p.startsWith("+7")) return "רוסיה";
  return "אחר";
}

export async function GET() {
  const supabase = createServiceClient();

  // Pull all participants with contact info
  const { data: participants } = await supabase
    .from("participants")
    .select("email, phone, first_name_en, last_name_en, marketing_consent, order_id, orders(created_at, events(destination_country))")
    .or("email.not.is.null,phone.not.is.null");

  // Also users
  const { data: users } = await supabase
    .from("users")
    .select("email, phone, display_name, role, is_active, created_at");

  // Unsubscribes
  const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
  const unsubSet = new Set((unsubs || []).map((u: any) => u.email?.toLowerCase()));

  const contacts: Contact[] = [];
  for (const p of participants || []) {
    const orderData = Array.isArray((p as any).orders) ? (p as any).orders[0] : (p as any).orders;
    contacts.push({
      email: p.email || null,
      phone: p.phone || null,
      first_name: p.first_name_en || null,
      last_name: p.last_name_en || null,
      country: detectCountry(p.phone) || orderData?.events?.destination_country || null,
      marketing_consent: !!(p as any).marketing_consent,
      source: "booking",
      last_order_at: orderData?.created_at || null,
    });
  }
  for (const u of users || []) {
    contacts.push({
      email: u.email || null,
      phone: u.phone || null,
      first_name: u.display_name || null,
      last_name: null,
      country: detectCountry(u.phone),
      marketing_consent: false, // users don't marketing-consent by default
      source: `user:${u.role}`,
      last_order_at: u.created_at,
    });
  }

  // Stats
  const totalEmails = contacts.filter((c) => c.email).length;
  const totalPhones = contacts.filter((c) => c.phone).length;

  const uniqueEmails = new Set(contacts.map((c) => c.email?.toLowerCase()).filter(Boolean));
  const uniquePhones = new Set(contacts.map((c) => c.phone?.replace(/[^0-9]/g, "")).filter(Boolean));

  const countryCounts: Record<string, number> = {};
  for (const c of contacts) {
    const country = c.country || "לא ידוע";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  }

  // Dedupe by email (prefer marketing_consent=true, then most recent)
  const dedupedMap = new Map<string, Contact>();
  for (const c of contacts) {
    const key = (c.email?.toLowerCase() || c.phone?.replace(/[^0-9]/g, "") || "").trim();
    if (!key) continue;
    const existing = dedupedMap.get(key);
    if (!existing) dedupedMap.set(key, c);
    else {
      if (c.marketing_consent && !existing.marketing_consent) dedupedMap.set(key, c);
      else if ((c.last_order_at || "") > (existing.last_order_at || "")) dedupedMap.set(key, c);
    }
  }
  const deduped = Array.from(dedupedMap.values()).map((c) => ({
    ...c,
    unsubscribed: c.email ? unsubSet.has(c.email.toLowerCase()) : false,
  }));

  return NextResponse.json({
    stats: {
      total_emails: totalEmails,
      unique_emails: uniqueEmails.size,
      total_phones: totalPhones,
      unique_phones: uniquePhones.size,
      by_country: countryCounts,
      unsubscribed_emails: unsubSet.size,
      marketing_consent_count: contacts.filter((c) => c.marketing_consent).length,
    },
    contacts: deduped,
  });
}
