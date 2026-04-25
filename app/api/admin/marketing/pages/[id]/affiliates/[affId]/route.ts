export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; affId: string } }) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("marketing_affiliates")
    .delete()
    .eq("id", params.affId)
    .eq("page_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
