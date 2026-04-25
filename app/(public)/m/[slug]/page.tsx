import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import HeroBody from "./hero-body";

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

  return (
    <div dir="rtl" className="relative min-h-screen bg-black text-white">
      {/* Page-wide background — absolute, grows with content */}
      {page.cover_image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/85 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.30),transparent_70%)] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-black opacity-90 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.25),transparent_60%)] pointer-events-none" />
        </>
      )}

      {/* Hero */}
      <header className="relative">
        <div className="relative max-w-3xl mx-auto px-5 pt-10 pb-4 md:pt-14 md:pb-6 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-none" style={{ letterSpacing: "0.04em" }}>
            {page.title}
          </h1>

          {(page.main_artist || page.guest_artist) && (
            <div dir="ltr" className="mt-5 leading-[1.05]">
              {page.main_artist && (
                <div className="text-3xl md:text-5xl font-black uppercase tracking-tight">{page.main_artist}</div>
              )}
              {page.guest_artist && (
                <div className="text-3xl md:text-5xl font-black uppercase tracking-tight">{page.guest_artist}</div>
              )}
            </div>
          )}

          {(page.event_date || page.city) && (
            <p dir="ltr" className="mt-4 text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-white/95">
              {[formatDate(page.event_date), page.city].filter(Boolean).join(" ")}
            </p>
          )}

          {page.venue_name && (
            <p className="mt-1.5 text-[11px] text-white/55">{page.venue_name}{page.country ? `, ${page.country}` : ""}</p>
          )}
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-5 pt-3 pb-8">
        <HeroBody
          slug={page.slug}
          affiliateCode={searchParams.ref || ""}
          introText={page.intro_text || ""}
          customHtml={customHtml}
        />
      </main>
    </div>
  );
}
