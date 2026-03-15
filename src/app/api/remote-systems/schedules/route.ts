import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayDateString, getTomorrowDateString } from "@/lib/date-utils";

// GET /api/remote-systems/schedules — returns active systems with today + tomorrow appointments
export async function GET() {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  const systems = await prisma.remoteSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  const result = await Promise.all(
    systems.map(async (sys) => {
      const [todayAppts, tomorrowAppts] = await Promise.all([
        prisma.appointment.findMany({
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
        }),
        prisma.appointment.findMany({
          where: {
            remoteSystemId: sys.id,
            appointmentDate: tomorrow,
            status: "BOOKED",
          },
          include: {
            patient: { select: { name: true } },
            doctor: { select: { name: true } },
          },
          orderBy: { slotStartTime: "asc" },
        }),
      ]);

      const mapAppt = (a: typeof todayAppts[number]) => ({
        id: a.id,
        patientName: a.patient.name,
        doctorName: a.doctor.name,
        slotStartTime: a.slotStartTime,
        slotEndTime: a.slotEndTime,
        status: a.status,
      });

      return {
        id: sys.id,
        name: sys.name,
        location: sys.location,
        isActive: sys.isActive,
        todayAppointments: todayAppts.map(mapAppt),
        tomorrowAppointments: tomorrowAppts.map(mapAppt),
      };
    })
  );

  return NextResponse.json({ systems: result, today, tomorrow });
}
