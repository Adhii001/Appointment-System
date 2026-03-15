import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/date-utils";
import { generateSlots } from "@/lib/slot-utils";

// GET /api/stats - Admin dashboard statistics
export async function GET() {
  const today = getTodayDateString();

  // Current month range
  const [year, month] = today.split("-").map(Number);
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const lastOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [
    totalDoctors,
    totalPatients,
    todayAppointments,
    monthAppointments,
    upcomingAppointments,
    doctors,
    recentAppointments,
  ] = await Promise.all([
    prisma.doctor.count(),
    prisma.patient.count(),
    prisma.appointment.count({ where: { appointmentDate: today } }),
    prisma.appointment.count({
      where: { appointmentDate: { gte: firstOfMonth, lte: lastOfMonth } },
    }),
    prisma.appointment.count({ where: { appointmentDate: { gt: today } } }),
    prisma.doctor.findMany({
      include: { _count: { select: { appointments: true } } },
    }),
    prisma.appointment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { patient: true, doctor: true },
    }),
  ]);

  // Calculate available/full doctors for today
  const doctorsWithAvailability = await Promise.all(
    doctors.map(async (doc) => {
      const slots = generateSlots(
        doc.consultStartTime,
        doc.consultEndTime,
        doc.slotDuration
      );
      const booked = await prisma.appointment.count({
        where: {
          doctorId: doc.id,
          appointmentDate: today,
          status: "BOOKED",
        },
      });
      const available = Math.max(slots.length - booked, 0);
      return {
        ...doc,
        totalSlots: slots.length,
        bookedSlots: booked,
        availableSlots: available,
      };
    })
  );

  const availableDoctors = doctorsWithAvailability.filter((d) => d.availableSlots > 0).length;
  const fullDoctors = doctorsWithAvailability.filter((d) => d.availableSlots <= 0).length;

  const doctorsToday = doctorsWithAvailability.map((d) => ({
    id: d.id,
    name: d.name,
    totalSlots: d.totalSlots,
    bookedSlots: d.bookedSlots,
    availableSlots: d.availableSlots,
  }));

  return NextResponse.json({
    totalDoctors,
    totalPatients,
    todayAppointments,
    monthAppointments,
    upcomingAppointments,
    availableDoctors,
    fullDoctors,
    recentAppointments,
    doctorsToday,
  });
}
