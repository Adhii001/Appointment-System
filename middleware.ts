import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, deserializeSession } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root always → login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Login page and auth API are always public
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Internal API routes skip page-guard middleware
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // All page routes require at least a parseable session cookie
  const cookieVal = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = deserializeSession(cookieVal);
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-specific guards (server component layouts also enforce these,
  // but this catches any pages that don't have one)
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith("/doctor-portal") &&
    session.role !== "DOCTOR" &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith("/home") &&
    session.role !== "FRONT_OFFICE" &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
