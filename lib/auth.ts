import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";
import { createOtp, verifyOtp } from "@/lib/otp";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      display_name: string;
      is_primary_admin: boolean;
      marketing_page_id?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    display_name: string;
    is_primary_admin: boolean;
    marketing_page_id?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: string;
    display_name: string;
    is_primary_admin: boolean;
    marketing_page_id?: string | null;
  }
}

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60_000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "אימייל", type: "text" },
        password: { label: "סיסמה", type: "password" },
        code: { label: "קוד אימות", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("נא למלא אימייל וסיסמה");
        }

        const supabase = createServiceClient();
        const identifier = credentials.email;

        const { data: byEmail } = await supabase
          .from("users")
          .select("*")
          .eq("email", identifier)
          .eq("is_active", true)
          .maybeSingle();

        const user = byEmail || (await supabase
          .from("users")
          .select("*")
          .eq("phone", identifier)
          .eq("is_active", true)
          .maybeSingle()).data;

        if (!user) {
          throw new Error("אימייל או סיסמה שגויים");
        }

        // Lockout check
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60_000);
          throw new Error(`החשבון נעול עקב ניסיונות כושלים. נסה שוב עוד ${minutesLeft} דקות.`);
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          const failed = (user.failed_login_count || 0) + 1;
          const update: any = { failed_login_count: failed };
          if (failed >= MAX_FAILED) {
            update.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
            update.failed_login_count = 0;
          }
          await supabase.from("users").update(update).eq("id", user.id);
          await supabase.from("audit_log").insert({
            user_id: user.id,
            action: failed >= MAX_FAILED ? "login_locked" : "login_failed",
            entity_type: "user",
            entity_id: user.id,
            after_data: { attempt: failed, locked: failed >= MAX_FAILED },
            created_at: new Date().toISOString(),
          });
          throw new Error("אימייל או סיסמה שגויים");
        }

        // 2FA required?
        if (user.two_factor_enabled) {
          if (!credentials.code) {
            // Send OTP
            const code = await createOtp(user.id, "login_2fa");
            try {
              const { sendTemplateMessage } = await import("@/lib/wa-templates");
              if (user.phone) await sendTemplateMessage("2fa_code", user.phone, { code }, { recipient_type: "admin" });
            } catch {}
            throw new Error("2FA_REQUIRED");
          }
          const ok = await verifyOtp(user.id, credentials.code, "login_2fa");
          if (!ok) throw new Error("קוד אימות שגוי או פג תוקף");
        }

        // Success: reset failed count + set last_login
        await supabase.from("users").update({
          failed_login_count: 0,
          locked_until: null,
          last_login_at: new Date().toISOString(),
        }).eq("id", user.id);
        await supabase.from("audit_log").insert({
          user_id: user.id,
          action: "login_success",
          entity_type: "user",
          entity_id: user.id,
          after_data: { with_2fa: !!user.two_factor_enabled },
          created_at: new Date().toISOString(),
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
          is_primary_admin: user.is_primary_admin ?? false,
          marketing_page_id: user.marketing_page_id ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60, // 4 hours — a single admin workday session
    updateAge: 30 * 60, // sliding: any action in the last 30 min extends the session
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.display_name = user.display_name;
        token.is_primary_admin = user.is_primary_admin;
        token.marketing_page_id = user.marketing_page_id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        role: token.role,
        display_name: token.display_name,
        is_primary_admin: token.is_primary_admin,
        marketing_page_id: token.marketing_page_id ?? null,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
