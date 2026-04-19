export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { supplierAuthSchema, parseOrFail } from "@/lib/schemas";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`supplier-auth:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "יותר מדי ניסיונות. נסה שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const parsed = parseOrFail(supplierAuthSchema, await request.json());
  if (!parsed.ok) return NextResponse.json({ error: "יש להזין מייל וסיסמה" }, { status: 400 });
  const { email, password } = parsed.data;

  const supabase = createServiceClient();

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
