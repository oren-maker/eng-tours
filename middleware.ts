import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Routes that require admin login (pages only, not API)
const adminPages = [
  "/dashboard",
  "/events",
  "/flights",
  "/hotels",
  "/tickets",
  "/packages",
  "/orders",
  "/waiting-list",
  "/coupons",
  "/financial",
  "/faq",
  "/users",
  "/whatsapp",
  "/settings",
  "/audit-log",
];

function isAdminPage(pathname: string): boolean {
  return adminPages.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isSupplierPage(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow ALL API routes, static files, auth routes, and public pages
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/pay/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protected admin pages - require admin login
  if (isAdminPage(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Supplier portal - require supplier login
  if (isSupplierPage(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "supplier") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
