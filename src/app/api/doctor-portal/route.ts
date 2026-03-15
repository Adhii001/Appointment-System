import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/date-utils";
import { generateSlots } from "@/lib/slot-utils";

// GET /api/doctor-portal?doctorId=X&date=YYYY-MM-DD
// Returns the doctor's appointments for the given date with full details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date") || getTodayDateString();

  if (!doctorId) {
    return NextResponse.json(
      { error: "doctorId is required" },
      { status: 400 }
    );
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(doctorId) },
  });

  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Generate all possible slots for this doctor
  const allSlots = generateSlots(
    doctor.consultStartTime,
    doctor.consultEndTime,
    doctor.slotDuration
  );

  // Get booked/in-progress/completed appointments for this date
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      appointmentDate: date,
    },
    include: {
      patient: { select: { id: true, name: true, phone: true, age: true } },
      remoteSystem: { select: { id: true, name: true, location: true } },
    },
    orderBy: { slotStartTime: "asc" },
  });

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      consultStartTime: doctor.consultStartTime,
      consultEndTime: doctor.consultEndTime,
      slotDuration: doctor.slotDuration,
    },
    date,
    today: getTodayDateString(),
    totalSlots: allSlots.length,
    appointments: appointments.map((a) => ({
      id: a.id,
      patientId: a.patient.id,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      patientAge: a.patient.age,
      slotStartTime: a.slotStartTime,
      slotEndTime: a.slotEndTime,
      status: a.status,
      remoteSystem: a.remoteSystem,
    })),
  });
}
