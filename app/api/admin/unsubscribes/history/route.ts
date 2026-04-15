export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_unsubscribe_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = data || [];
  const actorIds = Array.from(new Set(events.map((e: any) => e.actor_user_id).filter(Boolean)));
  let actorMap: Record<string, { name?: string; email?: string }> = {};
  if (actorIds.length > 0) {
    const { data: users } = await supabase.from("users").select("id, name, email").in("id", actorIds);
    for (const u of users || []) actorMap[(u as any).id] = { name: (u as any).name, email: (u as any).email };
  }
  const enriched = events.map((e: any) => ({
    ...e,
    actor: e.actor_user_id ? actorMap[e.actor_user_id] : null,
  }));
  return NextResponse.json({ events: enriched });
}
