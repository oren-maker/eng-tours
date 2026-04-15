export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data: b, error } = await supabase
    .from("backups")
    .select("storage_path")
    .eq("id", params.id)
    .single();
  if (error || !b?.storage_path) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const { data: signed, error: sErr } = await supabase.storage
    .from("backups")
    .createSignedUrl(b.storage_path, 300);
  if (sErr || !signed) return NextResponse.json({ error: sErr?.message || "Sign failed" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl);
}
