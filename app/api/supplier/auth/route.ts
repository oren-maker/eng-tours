export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "יש להזין מייל וסיסמה" }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email, password_hash, role, display_name, is_active")
    .eq("email", email)
    .single();

  if (!user || !user.is_active) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }

  // Allow both supplier and admin
  if (user.role !== "supplier" && user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash || "");
  if (!valid) {
    return NextResponse.json({ error: "פרטי התחברות שגויים" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role, display_name: user.display_name },
  });
}
