import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const adminPages = [
  "/dashboard", "/events", "/airlines", "/flights", "/hotels", "/tickets",
  "/packages", "/orders", "/issues", "/waiting-list", "/coupons", "/financial",
  "/faq", "/users", "/whatsapp", "/email", "/marketing", "/settings", "/settings-hub", "/audit-log",
  "/test",
];

// Public API endpoints that don't require admin auth (explicit allow-list)
const publicApiPrefixes = [
  "/api/auth/",                          // NextAuth
  "/api/orders/token/",                  // Public: fetch order by share_token (supplier/customer portal)
  "/api/supplier/auth",                  // Public: supplier login
  "/api/supplier/confirm-all",           // Public: supplier submits confirmations via share_token
  "/api/supplier/payment",               // Public: payment entry via share_token
  "/api/whatsapp/webhook",               // WaSender webhook (signed with secret)
  "/api/pulseem/webhook",                // Pulseem DLR webhook (signed with secret)
  "/api/health",                         // Public health check (no secrets exposed)
  "/api/payments/",                      // Customer payment flow via payment_token
  "/api/coupons/validate",               // Public: validate coupon code during booking
  "/api/ocr/passport",                   // Public: OCR during booking form
  "/api/passport/ocr",                   // Public: new OCR during booking form (Groq/Gemini)
  "/api/unsubscribe",                    // Public: email unsubscribe
  "/api/email/templates/preview",        // Public: email template preview (renders sample data only)
];

// Cron endpoints — auth is done inside the route via CRON_SECRET, middleware lets them through
const cronEndpoints = [
  "/api/events/auto-archive",
  "/api/events/auto-reminders",
  "/api/cron/cleanup",
];

// Public API endpoints that only allow specific HTTP methods
// "POST-only public" means GET still requires admin
const publicApiExact: { path: string; methods: string[] }[] = [
  { path: "/api/orders", methods: ["POST"] }, // Public can create orders; GET requires admin
];

function isAdminPage(pathname: string): boolean {
  return adminPages.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isSupplierPage(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function isPublicApi(pathname: string, method: string): boolean {
  if (publicApiPrefixes.some((p) => pathname.startsWith(p))) return true;
  if (cronEndpoints.includes(pathname)) return true; // auth'd inside route
  return publicApiExact.some((e) => pathname === e.path && e.methods.includes(method));
}

function genRequestId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const requestId = request.headers.get("x-request-id") || genRequestId();

  // Allow static + root/login + public pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/unsubscribe" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/supplier/") ||
    pathname.endsWith("/print") ||
    pathname.includes(".")
  ) {
    return withRequestId(NextResponse.next(), requestId);
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, method)) return withRequestId(NextResponse.next(), requestId);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return withRequestId(NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 }), requestId);
    if (token.role !== "admin") return withRequestId(NextResponse.json({ error: "Forbidden", request_id: requestId }, { status: 403 }), requestId);

    // CSRF: for state-changing methods require same-origin.
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      const origin = request.headers.get("origin") || "";
      const host = request.headers.get("host") || "";
      const allowed = new Set([
        `https://${host}`,
        `http://${host}`,
        process.env.NEXTAUTH_URL || "",
      ].filter(Boolean));
      if (!origin || !allowed.has(origin)) {
        return withRequestId(NextResponse.json({ error: "Origin not allowed", request_id: requestId }, { status: 403 }), requestId);
      }
    }
    return withRequestId(NextResponse.next(), requestId);
  }

  // Admin pages
  if (isAdminPage(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return withRequestId(NextResponse.redirect(loginUrl), requestId);
    }
    if (token.role !== "admin") {
      if (token.role === "supplier") return withRequestId(NextResponse.redirect(new URL("/portal", request.url)), requestId);
      return withRequestId(NextResponse.redirect(new URL("/login", request.url)), requestId);
    }
  }

  // Supplier portal
  if (isSupplierPage(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== "supplier" && token.role !== "admin")) {
      return withRequestId(NextResponse.redirect(new URL("/login", request.url)), requestId);
    }
  }

  return withRequestId(NextResponse.next(), requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
