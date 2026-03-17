import prisma from "@/lib/prisma";

export type UserRole = "FRONT_OFFICE" | "ADMIN" | "DOCTOR";

export interface AuthSession {
  role: UserRole;
  username: string;
  displayName: string;
  doctorId?: number;
  sessionToken?: string;
}

export const AUTH_COOKIE_NAME = "auth_session";

function normalizeCredential(value: string): string {
  return value.trim().toLowerCase();
}

function getDoctorFirstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  // Skip honorific prefixes like "Dr.", "Mr.", "Mrs.", etc.
  const first = parts.find((p) => !p.endsWith(".")) ?? parts[0];
  return first.toLowerCase();
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthSession | null> {
  const normalizedUsername = normalizeCredential(username);
  const normalizedPassword = normalizeCredential(password);

  if (!normalizedUsername || !normalizedPassword) {
    return null;
  }

  if (
    normalizedUsername === "frontoffice" &&
    normalizedPassword === "frontoffice"
  ) {
    return {
      role: "FRONT_OFFICE",
      username: normalizedUsername,
      displayName: "Front Office",
    };
  }

  if (normalizedUsername === "admin" && normalizedPassword === "admin") {
    return {
      role: "ADMIN",
      username: normalizedUsername,
      displayName: "Admin",
    };
  }

  if (normalizedUsername !== normalizedPassword) {
    return null;
  }

  const doctors = await prisma.doctor.findMany({
    select: { id: true, name: true },
  });

  const matchingDoctor = doctors.find(
    (doctor) => getDoctorFirstName(doctor.name) === normalizedUsername
  );

  if (!matchingDoctor) {
    return null;
  }

  return {
    role: "DOCTOR",
    username: normalizedUsername,
    displayName: matchingDoctor.name,
    doctorId: matchingDoctor.id,
  };
}

export function defaultRedirectForRole(session: AuthSession): string {
  if (session.role === "ADMIN") {
    return "/admin";
  }

  if (session.role === "DOCTOR") {
    return session.doctorId
      ? `/doctor-portal?doctorId=${session.doctorId}`
      : "/doctor-portal";
  }

  return "/home";
}

export function serializeSession(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function deserializeSession(value: string | undefined): AuthSession | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AuthSession>;

    if (
      parsed.role !== "FRONT_OFFICE" &&
      parsed.role !== "ADMIN" &&
      parsed.role !== "DOCTOR"
    ) {
      return null;
    }

    if (!parsed.username || !parsed.displayName) {
      return null;
    }

    return {
      role: parsed.role,
      username: parsed.username,
      displayName: parsed.displayName,
      doctorId: parsed.doctorId,
      sessionToken: typeof parsed.sessionToken === "string" ? parsed.sessionToken : undefined,
    };
  } catch {
    return null;
  }
}
