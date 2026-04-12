import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Admin-only routes
const adminRoutes = [
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
];

// Supplier portal routes
const supplierRoutes = ["/portal"];

// Public routes (no auth required)
const publicRoutes = ["/", "/login", "/api/auth"];

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/events/")) return true; // Public booking pages
  if (pathname.startsWith("/pay/")) return true; // Payment pages
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.includes(".")) return true; // Static files
  return false;
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isSupplierRoute(pathname: string): boolean {
  return supplierRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // No token = redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require admin role
  if (isAdminRoute(pathname) && token.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Supplier routes require supplier role
  if (isSupplierRoute(pathname) && token.role !== "supplier") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
