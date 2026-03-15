import { NextRequest, NextResponse } from "next/server";
import { getTodayDateString } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date") || getTodayDateString();

  if (!doctorId) {
    return NextResponse.json(
      { error: "doctorId query parameter is required" },
      { status: 400 }
    );
  }

  const response = await fetch(
    `${origin}/api/doctor/${doctorId}/slots?date=${encodeURIComponent(date)}`,
    { cache: "no-store" }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
