import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, deserializeSession } from "@/lib/auth";
import { isTokenActive } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = deserializeSession(cookieValue);

  if (!session || !session.sessionToken || !isTokenActive(session.sessionToken)) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      role: session.role,
      username: session.username,
      displayName: session.displayName,
      doctorId: session.doctorId ?? null,
    },
  });
}
