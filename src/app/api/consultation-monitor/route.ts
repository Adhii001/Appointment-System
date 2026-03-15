import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/date-utils";

// GET /api/consultation-monitor — returns each active remote system with today's assigned appointments
export async function GET() {
  const today = getTodayDateString();

  const systems = await prisma.remoteSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const result = await Promise.all(
    systems.map(async (sys) => {
      const appointments = await prisma.appointment.findMany({
        where: {
          remoteSystemId: sys.id,
          appointmentDate: today,
          status: "BOOKED",
        },
        include: {
          patient: { select: { name: true } },
          doctor: { select: { name: true } },
        },
        orderBy: { slotStartTime: "asc" },
      });

      return {
        id: sys.id,
        name: sys.name,
        location: sys.location,
        appointments: appointments.map((a) => ({
          id: a.id,
          patientName: a.patient.name,
          doctorName: a.doctor.name,
          slotStartTime: a.slotStartTime,
          slotEndTime: a.slotEndTime,
          status: a.status,
        })),
      };
    })
  );

  // Also count unassigned appointments for today (remoteSystemId is null)
  const unassigned = await prisma.appointment.count({
    where: {
      appointmentDate: today,
      status: "BOOKED",
      remoteSystemId: null,
    },
  });

  return NextResponse.json({ systems: result, unassignedCount: unassigned, date: today });
}
