import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const adminPages = [
  "/dashboard", "/events", "/airlines", "/flights", "/hotels", "/tickets",
  "/packages", "/orders", "/issues", "/waiting-list", "/coupons", "/financial",
  "/faq", "/users", "/whatsapp", "/email", "/settings", "/settings-hub", "/audit-log",
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
  "/api/payments/",                      // Customer payment flow via payment_token
  "/api/coupons/validate",               // Public: validate coupon code during booking
  "/api/ocr/passport",                   // Public: OCR during booking form
  "/api/passport/ocr",                   // Public: new OCR during booking form (Groq/Gemini)
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Allow static + root/login + public pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/pay/") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/supplier/") ||
    pathname.endsWith("/print") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    // Allow explicit public APIs
    if (isPublicApi(pathname, method)) return NextResponse.next();
    // All other APIs require admin auth
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (token.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.next();
  }

  // Admin pages
  if (isAdminPage(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (token.role !== "admin") {
      if (token.role === "supplier") return NextResponse.redirect(new URL("/portal", request.url));
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Supplier portal
  if (isSupplierPage(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== "supplier" && token.role !== "admin")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
