export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("slug, title, content, updated_at")
    .eq("slug", slug)
    .single();
  if (error || !data) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { slug } = await params;
  const body = await request.json();
  const updates: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: session.user.id };
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.content === "string") updates.content = body.content;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .update(updates)
    .eq("slug", slug)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
