const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const activeSystems = await prisma.remoteSystem.findMany({ where: { isActive: true } });
  
  if (activeSystems.length === 0) {
    console.log("No remote systems to fill!");
    return;
  }

  // Get doctors and patient
  const allDoctors = await prisma.doctor.findMany({ take: 6 });
  const patient = await prisma.patient.findFirst();

  if (allDoctors.length < activeSystems.length || !patient) {
    console.log("Need at least enough doctors to fill systems, and 1 patient");
    return;
  }

  // Find a valid future date
  const date = new Date();
  date.setDate(date.getDate() + 2); // Two days from now, to avoid "EXPIRED" time slot issues
  const dateString = date.toISOString().split("T")[0];
  
  // Use a common slot start time for all of them
  const slotStartTime = "10:00"; 
  const slotEndTime = "10:30";
  
  for (let i = 0; i < activeSystems.length; i++) {
    const sys = activeSystems[i];
    const doc = allDoctors[i]; // Different doctor for each system

    // Delete any existing appointment for this doctor at this slot first to avoid unique constraints if any
    await prisma.appointment.deleteMany({
      where: { doctorId: doc.id, appointmentDate: dateString, slotStartTime }
    });

    // Create an appointment for this system & slot
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        patientName: patient.name,
        doctorId: doc.id,
        appointmentDate: dateString,
        slotStartTime: slotStartTime,
        slotEndTime: slotEndTime,
        status: "BOOKED",
        remoteSystemId: sys.id,
      }
    });
    console.log(`Scheduled doc ${doc.name} to system ${sys.name} at ${slotStartTime}`);
  }

  console.log(`All ${activeSystems.length} systems are now occupied at ${slotStartTime} on ${dateString}`);
  
  // The NEXT available doctor is allDoctors[activeSystems.length]
  const targetDoc = allDoctors[activeSystems.length];
  console.log(`To test the conflict, book another appointment on ${dateString} at ${slotStartTime} with Doctor ${targetDoc.name}.`);
  console.log(`Expected Result: It should fail because systems are full, and suggest 10:30 for Doctor ${targetDoc.name}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
