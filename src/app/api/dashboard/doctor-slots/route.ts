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

  const baseUrl = request.nextUrl.origin;

  try {
    const response = await fetch(
      `${baseUrl}/api/doctor/${doctorId}/slots?date=${encodeURIComponent(date)}`,
      { cache: "no-store" }
    );

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const bodyText = await response.text();
    return NextResponse.json(
      {
        error: "Upstream endpoint did not return JSON",
        upstreamStatus: response.status,
        upstreamContentType: contentType || "unknown",
        upstreamBodyPreview: bodyText.slice(0, 200),
      },
      { status: response.ok ? 502 : response.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to reach upstream endpoint",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
