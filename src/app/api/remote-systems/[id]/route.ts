import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitDoctorUpdate } from "@/lib/socket-server";

// PUT /api/remote-systems/:id — update a remote system
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const systemId = Number(id);

  const body = await request.json();
  const { name, location, isActive } = body;

  const existing = await prisma.remoteSystem.findUnique({
    where: { id: systemId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Remote system not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim().length > 0) data.name = name.trim();
  if (typeof location === "string") data.location = location.trim();
  if (typeof isActive === "boolean") data.isActive = isActive;

  const updated = await prisma.remoteSystem.update({
    where: { id: systemId },
    data,
  });

  emitDoctorUpdate();

  return NextResponse.json(updated);
}

// DELETE /api/remote-systems/:id — delete a remote system
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const systemId = Number(id);

  const existing = await prisma.remoteSystem.findUnique({
    where: { id: systemId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Remote system not found" }, { status: 404 });
  }

  // Check if any future appointments are assigned to this system
  const today = new Date().toISOString().split("T")[0];
  const futureAssignments = await prisma.appointment.count({
    where: {
      remoteSystemId: systemId,
      appointmentDate: { gte: today },
      status: "BOOKED",
    },
  });

  if (futureAssignments > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${futureAssignments} upcoming appointment(s) are assigned to this system. Reassign or cancel them first.`,
      },
      { status: 409 }
    );
  }

  await prisma.remoteSystem.delete({ where: { id: systemId } });
  emitDoctorUpdate();

  return NextResponse.json({ success: true });
}
