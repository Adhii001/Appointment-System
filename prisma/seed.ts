import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.remoteSystem.deleteMany();

  // Create 7 sample doctors
  const doctors = [
    "Dr. Sarah Johnson",
    "Dr. Michael Chen",
    "Dr. Emily Williams",
    "Dr. James Brown",
    "Dr. Maria Garcia",
    "Dr. David Lee",
    "Dr. Anna Patel",
  ];

  for (const name of doctors) {
    await prisma.doctor.create({
      data: {
        name,
        consultStartTime: "10:00",
        consultEndTime: "16:00",
        slotDuration: 30,
      },
    });
  }

  // Create a few sample patients
  const patients = [
    { name: "John Smith", phone: "555-0101", age: 45 },
    { name: "Jane Doe", phone: "555-0102", age: 32 },
    { name: "Robert Wilson", phone: "555-0103", age: 58 },
    { name: "Lisa Anderson", phone: "555-0104", age: 27 },
    { name: "Tom Martinez", phone: "555-0105", age: 41 },
  ];

  for (const patient of patients) {
    await prisma.patient.create({ data: patient });
  }

  // Create 4 mock remote consultation systems
  const remoteSystems = [
    { name: "Remote Station 1", location: "Room 101" },
    { name: "Remote Station 2", location: "Room 102" },
    { name: "Remote Station 3", location: "Room 103" },
    { name: "Remote Station 4", location: "Room 104" },
  ];

  for (const sys of remoteSystems) {
    await prisma.remoteSystem.create({ data: sys });
  }

  console.log("Seed data created successfully!");
  console.log(`  - ${doctors.length} doctors`);
  console.log(`  - ${patients.length} patients`);
  console.log(`  - ${remoteSystems.length} remote consultation systems`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
