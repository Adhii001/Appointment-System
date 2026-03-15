import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date") || getTodayDateString();

  if (!doctorId) {
    return NextResponse.json(
      { error: "doctorId query parameter is required" },
      { status: 400 }
    );
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (!host) {
    return NextResponse.json(
      { error: "Unable to resolve request host" },
      { status: 500 }
    );
  }

  // In some proxy/dev setups (including Codespaces), localhost is served over HTTP.
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : forwardedProto || "http";

  const baseUrl = `${protocol}://${host}`;

  const response = await fetch(
    `${baseUrl}/api/doctor/${doctorId}/slots?date=${encodeURIComponent(date)}`,
    { cache: "no-store" }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
