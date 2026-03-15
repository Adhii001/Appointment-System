import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      name: true,
      consultStartTime: true,
      consultEndTime: true,
      slotDuration: true,
    },
  });

  const appointments = await prisma.appointment.findMany({
    take: 50,
    orderBy: [
      { appointmentDate: "asc" },
      { doctorId: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      doctorId: true,
      patientId: true,
      patientName: true,
      appointmentDate: true,
      slotStartTime: true,
      slotEndTime: true,
      status: true,
      createdAt: true,
    },
  });

  console.log("Doctors", JSON.stringify(doctors, null, 2));
  console.log("Appointments", JSON.stringify(appointments, null, 2));
  const emptyPatientNames = await prisma.appointment.count({
    where: { patientName: "" },
  });
  console.log("Empty patientName rows", emptyPatientNames);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
