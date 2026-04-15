export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.RESEND_API_KEY;
  const fromEmail = "noreply@eng-tours.com";
  const fromName = "ENG TOURS";

  let domainStatus: "unknown" | "verified" | "not_verified" | "error" = "unknown";
  let domainMessage = "";

  if (hasKey) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const domains = data?.data || [];
        const fromDomain = fromEmail.split("@")[1];
        const match = domains.find((d: any) => d.name === fromDomain);
        if (match) {
          domainStatus = match.status === "verified" ? "verified" : "not_verified";
          domainMessage = match.status;
        } else {
          domainStatus = "not_verified";
          domainMessage = `דומיין ${fromDomain} לא רשום ב-Resend`;
        }
      } else {
        domainStatus = "error";
        domainMessage = `Resend API error: ${res.status}`;
      }
    } catch (e: any) {
      domainStatus = "error";
      domainMessage = e.message || "Failed to check";
    }
  }

  return NextResponse.json({
    provider: "Resend",
    apiKeyConfigured: hasKey,
    fromEmail,
    fromName,
    domainStatus,
    domainMessage,
  });
}
