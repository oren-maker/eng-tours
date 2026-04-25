export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "קובץ חסר" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "קובץ גדול מ-10MB" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "סוג קובץ לא נתמך (png/jpg/webp/gif בלבד)" }, { status: 400 });

  const { data: page } = await supabase.from("marketing_pages").select("id, cover_image_url").eq("id", params.id).maybeSingle();
  if (!page) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const ext = file.name.split(".").pop()?.toLowerCase() || file.type.split("/")[1] || "bin";
  const key = `${params.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from("marketing-covers")
    .upload(key, new Uint8Array(arrayBuffer), { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from("marketing-covers").getPublicUrl(key);
  const cover_image_url = pub?.publicUrl || null;

  if (page.cover_image_url) {
    const m = page.cover_image_url.match(/marketing-covers\/(.+)$/);
    if (m?.[1]) await supabase.storage.from("marketing-covers").remove([m[1]]).catch(() => {});
  }

  const { error: updErr } = await supabase
    .from("marketing_pages")
    .update({ cover_image_url, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ cover_image_url });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data: page } = await supabase.from("marketing_pages").select("cover_image_url").eq("id", params.id).maybeSingle();
  if (page?.cover_image_url) {
    const m = page.cover_image_url.match(/marketing-covers\/(.+)$/);
    if (m?.[1]) await supabase.storage.from("marketing-covers").remove([m[1]]).catch(() => {});
  }
  await supabase.from("marketing_pages").update({ cover_image_url: null, updated_at: new Date().toISOString() }).eq("id", params.id);
  return NextResponse.json({ ok: true });
}
