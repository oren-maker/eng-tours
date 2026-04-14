export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { validatePassword } from "@/lib/password-policy";

export async function POST(request: NextRequest) {
  try {
    // Verify caller is authenticated and is primary admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "לא מחובר למערכת" },
        { status: 401 }
      );
    }

    if (!session.user.is_primary_admin) {
      return NextResponse.json(
        { error: "אין הרשאה ליצירת משתמשים" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, display_name, role, phone, whatsapp_number, whatsapp } = body;

    // Validate required fields
    if (!email || !password || !display_name || !role) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות הנדרשים" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "supplier"].includes(role)) {
      return NextResponse.json(
        { error: "תפקיד לא תקין" },
        { status: 400 }
      );
    }

    // Validate password policy
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "כתובת אימייל כבר קיימת במערכת" },
        { status: 409 }
      );
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email,
        password_hash,
        display_name,
        role,
        phone: phone || null,
        whatsapp_number: whatsapp_number || whatsapp || null,
        is_active: true,
        is_primary_admin: false,
        created_at: new Date().toISOString(),
      })
      .select("id, email, display_name, role, phone, is_active, created_at")
      .single();

    if (error) {
      console.error("Error creating user:", error);
      return NextResponse.json(
        { error: "שגיאה ביצירת המשתמש" },
        { status: 500 }
      );
    }

    // Audit log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    await logAction(
      session.user.id,
      "create_user",
      "user",
      newUser.id,
      undefined,
      { email, display_name, role },
      ip ?? undefined
    );

    return NextResponse.json(
      { message: "משתמש נוצר בהצלחה", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "שגיאה פנימית בשרת" },
      { status: 500 }
    );
  }
}
