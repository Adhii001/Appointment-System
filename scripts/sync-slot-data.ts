import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function generateSlots(start: string, end: string, duration: number) {
  const startMins = parseTimeToMinutes(start);
  const endMins = parseTimeToMinutes(end);
  if (startMins < 0 || endMins < 0 || duration <= 0 || endMins <= startMins) return [];

  const slots: Array<{ start: string; end: string }> = [];
  let cursor = startMins;
  while (cursor + duration <= endMins) {
    slots.push({
      start: formatMinutesToTime(cursor),
      end: formatMinutesToTime(cursor + duration),
    });
    cursor += duration;
  }
  return slots;
}

async function syncDoctor(doctor: {
  id: number;
  consultStartTime: string;
  consultEndTime: string;
  slotDuration: number;
}) {
  let start = doctor.consultStartTime;
  let end = doctor.consultEndTime;
  let duration = doctor.slotDuration;

  let slots = generateSlots(start, end, duration);

  // Normalize invalid configs to defaults to keep system operable.
  if (slots.length === 0) {
    start = "10:00";
    end = "16:00";
    duration = 30;
    slots = generateSlots(start, end, duration);
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        consultStartTime: start,
        consultEndTime: end,
        slotDuration: duration,
      },
    });
  }

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id },
    include: { patient: { select: { name: true } } },
    orderBy: [
      { appointmentDate: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  const grouped = new Map<string, typeof appointments>();
  for (const apt of appointments) {
    if (!grouped.has(apt.appointmentDate)) grouped.set(apt.appointmentDate, []);
    grouped.get(apt.appointmentDate)!.push(apt);
  }

  for (const [, dateAppointments] of grouped) {
    for (let i = 0; i < dateAppointments.length; i += 1) {
      const apt = dateAppointments[i];
      const slot = slots[i];

      if (slot) {
        await prisma.appointment.update({
          where: { id: apt.id },
          data: {
            slotStartTime: slot.start,
            slotEndTime: slot.end,
            status: "BOOKED",
            patientName: apt.patient.name,
          },
        });
      } else {
        // Overflow appointments beyond configured slots are marked cancelled.
        await prisma.appointment.update({
          where: { id: apt.id },
          data: {
            status: "CANCELLED",
            patientName: apt.patient.name,
          },
        });
      }
    }
  }
}

async function main() {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      consultStartTime: true,
      consultEndTime: true,
      slotDuration: true,
    },
  });

  for (const doctor of doctors) {
    await syncDoctor(doctor);
  }

  const cancelled = await prisma.appointment.count({ where: { status: "CANCELLED" } });
  console.log(`Slot data sync completed. Cancelled overflow appointments: ${cancelled}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
