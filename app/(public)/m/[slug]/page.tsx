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

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return "";
  const fmtSingle = (d: string) => {
    const dt = new Date(d);
    const yy = String(dt.getFullYear()).slice(-2);
    return `${dt.getDate()}.${dt.getMonth() + 1}.${yy}`;
  };
  if (!end || end === start) return fmtSingle(start);
  try {
    const s = new Date(start);
    const e = new Date(end);
    const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
    const sameYear = s.getFullYear() === e.getFullYear();
    const yy = (d: Date) => String(d.getFullYear()).slice(-2);
    if (sameMonth) {
      // 4-5.9.26
      return `${s.getDate()}-${e.getDate()}.${s.getMonth() + 1}.${yy(s)}`;
    }
    if (sameYear) {
      // 30.7-2.8.26
      return `${s.getDate()}.${s.getMonth() + 1}-${e.getDate()}.${e.getMonth() + 1}.${yy(s)}`;
    }
    return `${fmtSingle(start)} - ${fmtSingle(end)}`;
  } catch { return fmtSingle(start); }
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
    .select("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (!page) notFound();

  const vars: Record<string, string> = {
    title: page.title || "",
    main_artist: page.main_artist || "",
    guest_artist: page.guest_artist || "",
    event_date: formatDateRange(page.event_date, page.event_end_date),
    city: page.city || "",
    country: page.country || "",
    venue_name: page.venue_name || "",
    intro_text: page.intro_text || "",
  };

  const customHtml = page.html ? applyTemplate(page.html, vars) : "";
  const theme: string = page.theme || "default";

  return (
    <div dir="rtl" className="relative min-h-screen bg-black text-white" data-theme={theme}>
      {/* Page-wide background — absolute, grows with content */}
      {page.cover_image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
          <div className={`absolute inset-0 pointer-events-none ${theme === "sunset" ? "bg-gradient-to-b from-black/15 via-black/25 to-black/55" : "bg-gradient-to-b from-black/40 via-black/55 to-black/85"}`} />
          {theme === "sunset" ? (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,140,66,0.30),transparent_70%)] pointer-events-none" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.30),transparent_70%)] pointer-events-none" />
          )}
        </>
      ) : theme === "sunset" ? (
        <>
          {/* Sunset gradient (purple → orange → yellow) */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #5B4B8A 0%, #FF7A3D 60%, #FFD36E 100%)" }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,rgba(255,140,66,0.45),transparent_60%)] pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-black to-black opacity-90 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.25),transparent_60%)] pointer-events-none" />
        </>
      )}

      {/* Hero */}
      <header className="relative">
        <div className="relative max-w-3xl mx-auto px-5 pt-6 pb-4 md:pt-10 md:pb-6 text-center">
          {page.hero_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.hero_image_url}
                alt={page.title || ""}
                className="w-full max-w-2xl mx-auto h-auto block"
                style={{ maxHeight: "70vh", objectFit: "contain" }}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          {(page.event_date || page.city) && (
            <p dir="ltr" className="mt-4 text-xs md:text-sm font-bold tracking-[0.25em] uppercase text-white/95">
              {[formatDateRange(page.event_date, page.event_end_date), page.city].filter(Boolean).join(" ")}
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
          theme={theme}
          interestOptions={Array.isArray(page.interest_options) && page.interest_options.length ? page.interest_options : [
            { value: "package_inquiry", label: "חבילת סוף שבוע (טיסה + מלון)" },
            { value: "ticket_purchase", label: "רכישת כרטיס בלבד" },
          ]}
        />
      </main>
    </div>
  );
}
