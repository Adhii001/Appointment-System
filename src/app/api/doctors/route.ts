import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resetDoctorTimesIfNeeded } from "@/lib/doctor-reset";
import { generateSlots, validateConsultConfig } from "@/lib/slot-utils";

// GET /api/doctors - List all doctors with appointment counts
// Optional query: ?date=YYYY-MM-DD to calculate availability for a specific date
export async function GET(request: NextRequest) {
  await resetDoctorTimesIfNeeded();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const doctors = await prisma.doctor.findMany({
    include: {
      _count: {
        select: { appointments: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const doctorsWithAvailability = await Promise.all(
    doctors.map(async (doc) => {
      const generatedSlots = generateSlots(
        doc.consultStartTime,
        doc.consultEndTime,
        doc.slotDuration
      );

      const booked = await prisma.appointment.findMany({
        where: {
          doctorId: doc.id,
          appointmentDate: date,
          status: "BOOKED",
        },
        select: { slotStartTime: true },
      });

      const bookedSet = new Set(booked.map((item) => item.slotStartTime));
      const totalSlots = generatedSlots.length;
      const bookedSlots = generatedSlots.filter((slot) => bookedSet.has(slot.start)).length;
      const availableSlots = Math.max(totalSlots - bookedSlots, 0);

      return {
        ...doc,
        totalSlots,
        bookedSlots,
        availableSlots,
      };
    })
  );

  doctorsWithAvailability.sort((a, b) => b.availableSlots - a.availableSlots);
  return NextResponse.json(doctorsWithAvailability);
}

// POST /api/doctors - Add a new doctor
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    consultStartTime = "10:00",
    consultEndTime = "16:00",
    slotDuration = 30,
  } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Doctor name is required" },
      { status: 400 }
    );
  }

  const duration = Number(slotDuration);
  const configError = validateConsultConfig(
    String(consultStartTime),
    String(consultEndTime),
    duration
  );
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 400 });
  }

  const doctor = await prisma.doctor.create({
    data: {
      name: name.trim(),
      consultStartTime: String(consultStartTime),
      consultEndTime: String(consultEndTime),
      slotDuration: duration,
    },
  });

  return NextResponse.json(doctor, { status: 201 });
}
