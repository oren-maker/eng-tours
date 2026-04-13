import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ENG TOURS | מערכת ניהול אירועים",
  description: "פלטפורמת ניהול אירועי נסיעות - ENG TOURS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
