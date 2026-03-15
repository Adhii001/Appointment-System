import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitDoctorUpdate } from "@/lib/socket-server";

// POST /api/appointments/[id]/complete
// Mark an appointment as COMPLETED. If earlyFinish=true, auto-start the next appointment.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appointmentId = Number(id);

  if (isNaN(appointmentId)) {
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const earlyFinish = body.earlyFinish === true;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, patient: true, remoteSystem: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (appointment.status === "COMPLETED") {
    return NextResponse.json({ error: "Appointment is already completed" }, { status: 400 });
  }

  // Mark as COMPLETED
  const completedAppointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED" },
    include: { patient: true, doctor: true, remoteSystem: true },
  });

  let nextAppointment = null;

  if (earlyFinish) {
    // Find the next chronological booked appointment for the same doctor + date
    const nextBooked = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate: appointment.appointmentDate,
        status: "BOOKED",
        slotStartTime: { gt: appointment.slotStartTime },
      },
      orderBy: { slotStartTime: "asc" },
      include: { patient: true, remoteSystem: true },
    });

    if (nextBooked) {
      nextAppointment = await prisma.appointment.update({
        where: { id: nextBooked.id },
        data: { status: "IN_PROGRESS" },
        include: { patient: true, doctor: true, remoteSystem: true },
      });
    }
  }

  emitDoctorUpdate();

  return NextResponse.json({
    status: "success",
    completedAppointment,
    nextAppointment,
    earlyFinish,
  });
}
