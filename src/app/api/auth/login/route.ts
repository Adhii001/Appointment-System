import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  defaultRedirectForRole,
  serializeSession,
} from "@/lib/auth";
import { setActiveToken } from "@/lib/session-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  const username = body?.username ?? "";
  const password = body?.password ?? "";

  const authResult = await authenticateUser(username, password);

  if (!authResult) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  // Generate a new session token — this evicts any existing session
  const sessionToken = randomUUID();
  setActiveToken(sessionToken);
  const session = { ...authResult, sessionToken };

  const response = NextResponse.json({
    user: {
      role: session.role,
      username: session.username,
      displayName: session.displayName,
      doctorId: session.doctorId ?? null,
    },
    redirectPath: defaultRedirectForRole(session),
  });

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: serializeSession(session),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
