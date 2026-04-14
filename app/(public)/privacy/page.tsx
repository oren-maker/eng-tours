export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import Link from "next/link";

function renderMarkdown(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^### (.*)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-primary-900">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 class="text-3xl font-bold mt-4 mb-4 text-primary-900">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.*)$/gm, '<li class="mr-4">$1</li>');
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (m) => `<ul class="list-disc list-inside my-3 space-y-1">${m}</ul>`);
  html = html.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) =>
    /^<(h\d|ul|ol|blockquote)/.test(p) ? p : `<p class="my-3 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`
  ).join("\n");
  return html;
}

export default async function PrivacyPage() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("legal_documents").select("title, content, updated_at").eq("slug", "privacy").single();
  const doc: any = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <header className="bg-gradient-to-l from-primary-800 to-primary-600 text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ENG TOURS" className="h-10 w-auto object-contain" />
          <Link href="/" className="mr-auto text-sm text-white/80 hover:text-white">חזרה לאתר →</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8" dir="rtl">
          {doc ? (
            <div className="prose max-w-none text-right" dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }} />
          ) : (
            <p className="text-gray-500 text-center py-12">מדיניות הפרטיות לא נמצאה</p>
          )}
        </div>
      </main>
    </div>
  );
}
