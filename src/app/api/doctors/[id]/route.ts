import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitDoctorUpdate } from "@/lib/socket-server";
import { validateConsultConfig } from "@/lib/slot-utils";

// PUT /api/doctors/[id] - Update a doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doctorId = Number(id);

  if (isNaN(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID" }, { status: 400 });
  }

  const body = await request.json();
  const {
    name,
    consultStartTime,
    consultEndTime,
    slotDuration,
  } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Doctor name is required" }, { status: 400 });
  }

  const existing = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const nextStart = String(consultStartTime ?? existing.consultStartTime);
  const nextEnd = String(consultEndTime ?? existing.consultEndTime);
  const nextDuration = Number(slotDuration ?? existing.slotDuration);

  const configError = validateConsultConfig(nextStart, nextEnd, nextDuration);
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 400 });
  }

  const doctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      name: name.trim(),
      consultStartTime: nextStart,
      consultEndTime: nextEnd,
      slotDuration: nextDuration,
    },
  });

  emitDoctorUpdate();
  return NextResponse.json(doctor);
}

// DELETE /api/doctors/[id] - Delete a doctor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doctorId = Number(id);

  if (isNaN(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID" }, { status: 400 });
  }

  const existing = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const appointmentCount = await prisma.appointment.count({ where: { doctorId } });
  if (appointmentCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete "${existing.name}" — they have ${appointmentCount} existing appointment(s). Cancel those appointments first.`,
      },
      { status: 409 }
    );
  }

  await prisma.doctor.delete({ where: { id: doctorId } });
  emitDoctorUpdate();
  return NextResponse.json({ success: true });
}
