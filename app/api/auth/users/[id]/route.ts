export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

// PATCH /api/auth/users/[id] - Update user: details, password reset, archive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "admin" && !session.user.is_primary_admin)) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;

    // Password reset — admin only (any admin can reset, primary admin included)
    let passwordChanged = false;
    if (body.password) {
      const { validatePassword } = await import("@/lib/password-policy");
      const pc = validatePassword(body.password);
      if (!pc.ok) return NextResponse.json({ error: pc.error }, { status: 400 });
      updateData.password_hash = await bcrypt.hash(body.password, 12);
      updateData.password_changed_at = new Date().toISOString();
      updateData.failed_login_count = 0;
      updateData.locked_until = null;
      passwordChanged = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "אין שינויים" }, { status: 400 });
    }

    // Get before data
    const { data: before } = await supabase
      .from("users")
      .select("id, email, display_name, role, is_active, is_archived, is_primary_admin, phone")
      .eq("id", id)
      .single();

    if ((before as any)?.is_primary_admin && session.user.id !== id) {
      return NextResponse.json(
        { error: "לא ניתן לערוך את המנהל הראשי" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, email, display_name, role, is_active, is_archived, phone")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit — password reset gets its own action
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    if (passwordChanged) {
      await logAction(session.user.id, "reset_password", "user", id, undefined,
        { target_user: (before as any)?.email } as Record<string, unknown>, ip ?? undefined);
    }
    const auditBefore: Record<string, unknown> = { ...(before || {}) };
    delete (auditBefore as any).is_primary_admin;
    const auditAfter: Record<string, unknown> = { ...(data || {}) };
    if (Object.keys(updateData).some((k) => k !== "password_hash")) {
      await logAction(session.user.id, "update_user", "user", id, auditBefore, auditAfter, ip ?? undefined);
    }

    return NextResponse.json({ user: data });
  } catch (err: any) {
    console.error("User update error:", err);
    return NextResponse.json({ error: "שגיאה בעדכון משתמש" }, { status: 500 });
  }
}
