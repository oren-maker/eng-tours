export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

const ROTATION_DAYS = 90;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, role, password_changed_at, two_factor_enabled, last_login_at, marketing_page_id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const changedAt = user.password_changed_at ? new Date(user.password_changed_at) : null;
  const ageDays = changedAt ? Math.floor((Date.now() - changedAt.getTime()) / 86_400_000) : null;
  const rotationWarning = ageDays !== null && ageDays >= ROTATION_DAYS;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      marketing_page_id: user.marketing_page_id || null,
    },
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    marketing_page_id: user.marketing_page_id || null,
    two_factor_enabled: !!user.two_factor_enabled,
    last_login_at: user.last_login_at,
    password_changed_at: user.password_changed_at,
    password_age_days: ageDays,
    rotation_warning: rotationWarning,
    rotation_threshold_days: ROTATION_DAYS,
  });
}
