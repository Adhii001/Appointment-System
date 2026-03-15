import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitDoctorUpdate } from "@/lib/socket-server";

// GET /api/appointments/[id] - Fetch a single appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appointmentId = Number(id);

  if (isNaN(appointmentId)) {
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
      remoteSystem: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

// DELETE /api/appointments/[id] - Cancel an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appointmentId = Number(id);

  if (isNaN(appointmentId)) {
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  await prisma.appointment.delete({ where: { id: appointmentId } });
  emitDoctorUpdate();

  return NextResponse.json({ success: true });
}
