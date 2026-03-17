import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, deserializeSession } from "@/lib/auth";
import { isTokenActive } from "@/lib/session-store";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const val = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = deserializeSession(val);

  const allowed =
    session &&
    (session.role === "FRONT_OFFICE" || session.role === "ADMIN") &&
    session.sessionToken &&
    isTokenActive(session.sessionToken);

  if (!allowed) {
    redirect("/login");
  }

  return <>{children}</>;
}
