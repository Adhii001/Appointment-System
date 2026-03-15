import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PUT /api/patients/[id] - Update a patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patientId = Number(id);

  if (isNaN(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, phone, age } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }
  if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 150) {
    return NextResponse.json({ error: "Valid age is required (1–150)" }, { status: 400 });
  }

  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      name: name.trim(),
      phone: phone.trim(),
      age: Number(age),
    },
  });

  return NextResponse.json(patient);
}

// DELETE /api/patients/[id] - Delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patientId = Number(id);

  if (isNaN(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
  }

  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const appointmentCount = await prisma.appointment.count({ where: { patientId } });
  if (appointmentCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete "${existing.name}" — they have ${appointmentCount} existing appointment(s). Cancel those appointments first.`,
      },
      { status: 409 }
    );
  }

  await prisma.patient.delete({ where: { id: patientId } });
  return NextResponse.json({ success: true });
}
