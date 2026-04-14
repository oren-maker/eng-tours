import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

export function generateOtp(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

/** Create OTP for user, store hash, return plaintext code to send */
export async function createOtp(userId: string, purpose = "login_2fa", ttlMs = 5 * 60_000): Promise<string> {
  const code = generateOtp();
  const hash = await bcrypt.hash(code, 10);
  const supabase = createServiceClient();

  // Invalidate older OTPs for same purpose
  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  await supabase.from("otp_codes").insert({
    user_id: userId,
    code_hash: hash,
    purpose,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  });

  return code;
}

/** Verify OTP. Returns true if valid (and marks consumed). */
export async function verifyOtp(userId: string, code: string, purpose = "login_2fa"): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: otps } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(3);

  if (!otps || otps.length === 0) return false;

  for (const otp of otps as any[]) {
    if (otp.attempts >= 5) continue; // brute-force guard
    const ok = await bcrypt.compare(code, otp.code_hash);
    if (ok) {
      await supabase.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
      return true;
    }
    await supabase.from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
  }
  return false;
}
