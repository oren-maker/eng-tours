import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

// PATCH /api/auth/users/[id] - Update user (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.is_primary_admin) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.display_name !== undefined) updateData.display_name = body.display_name;

    // Get before data
    const { data: before } = await supabase
      .from("users")
      .select("id, email, display_name, role, is_active, is_primary_admin")
      .eq("id", id)
      .single();

    if ((before as any)?.is_primary_admin) {
      return NextResponse.json(
        { error: "לא ניתן לערוך את המנהל הראשי" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, email, display_name, role, is_active")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    await logAction(
      session.user.id,
      "update_user",
      "user",
      id,
      before as Record<string, unknown> | undefined,
      data as Record<string, unknown> | undefined,
      ip ?? undefined
    );

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון משתמש" }, { status: 500 });
  }
}
