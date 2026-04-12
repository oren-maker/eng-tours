import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceClient } from "@/lib/supabase";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      display_name: string;
      is_primary_admin: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    display_name: string;
    is_primary_admin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: string;
    display_name: string;
    is_primary_admin: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "אימייל", type: "text" },
        password: { label: "סיסמה", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("נא למלא אימייל וסיסמה");
        }

        const supabase = createServiceClient();

        // Allow login with email or phone
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .or(`email.eq.${credentials.email},phone.eq.${credentials.email}`)
          .eq("is_active", true)
          .single();

        if (error || !user) {
          throw new Error("אימייל או סיסמה שגויים");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValidPassword) {
          throw new Error("אימייל או סיסמה שגויים");
        }

        // Note: no last_login column in schema, skip update

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
          is_primary_admin: user.is_primary_admin ?? false,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
