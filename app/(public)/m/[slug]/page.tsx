import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import LeadForm from "./lead-form";

export const dynamic = "force-dynamic";

function applyTemplate(html: string, vars: Record<string, string>) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] || "");
}

function formatDate(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return d; }
}

export default async function PublicMarketingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { ref?: string };
}) {
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("marketing_pages")
    .select("id, slug, title, html, is_active, main_artist, guest_artist, event_date, city, country, venue_name, ticket_purchase_link, intro_text, cover_image_url, archived_at")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (!page) notFound();

  const vars: Record<string, string> = {
    title: page.title || "",
    main_artist: page.main_artist || "",
    guest_artist: page.guest_artist || "",
    event_date: formatDate(page.event_date),
    city: page.city || "",
    country: page.country || "",
    venue_name: page.venue_name || "",
    intro_text: page.intro_text || "",
  };

  const customHtml = page.html ? applyTemplate(page.html, vars) : "";
  const subtitleParts = [
    page.main_artist && page.guest_artist ? `${page.main_artist} hosts ${page.guest_artist}` : page.main_artist,
    formatDate(page.event_date),
    page.city,
  ].filter(Boolean);

  return (
    <div dir="rtl" className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Page-wide background */}
      {page.cover_image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.cover_image_url} alt="" className="fixed inset-0 w-full h-full object-cover pointer-events-none -z-10" />
          <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85 pointer-events-none -z-10" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.30),transparent_70%)] pointer-events-none -z-10" />
        </>
      ) : (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-red-950 via-black to-black opacity-90 pointer-events-none -z-10" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.25),transparent_60%)] pointer-events-none -z-10" />
        </>
      )}

      {/* Hero */}
      <header className="relative">
        <div className="relative max-w-3xl mx-auto px-5 pt-10 pb-3 md:pt-12 md:pb-4 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-none" style={{ letterSpacing: "0.05em" }}>
            {page.title}
          </h1>
          {subtitleParts.length > 0 && (
            <p dir="ltr" className="mt-2 text-base md:text-lg text-red-100/90 font-medium">
              {subtitleParts.join(" | ")}
            </p>
          )}
          {page.venue_name && (
            <p className="mt-0.5 text-sm text-white/60">📍 {page.venue_name}{page.country ? `, ${page.country}` : ""}</p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-3 pb-8">
        {/* Intro */}
        {page.intro_text && (
          <p className="text-base md:text-lg leading-relaxed text-white/80 text-center mb-5 whitespace-pre-line">
            {page.intro_text}
          </p>
        )}

        {/* Custom HTML (rendered above the form, sanitized only by trust — admin-edited) */}
        {customHtml && (
          <div className="mb-5 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: customHtml }} />
        )}

        {/* Lead form */}
        <LeadForm slug={page.slug} affiliateCode={searchParams.ref || ""} />

        <p className="mt-5 text-center text-[11px] text-white/40">
          הפרטים נשמרים אצלנו בלבד. נשלח אליך מידע רק לגבי האירוע הזה.
        </p>
      </main>
    </div>
  );
}
