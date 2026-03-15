const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const activeSystems = await prisma.remoteSystem.findMany({ where: { isActive: true } });
  
  if (activeSystems.length === 0) {
    console.log("No remote systems to fill!");
    return;
  }

  // Find a doctor (let's say Dr. James Brown, ID 2)
  const doctorId = 2; // Make sure this exists, or fetch first
  const doctor = await prisma.doctor.findFirst({ where: { id: doctorId } });
  const patient = await prisma.patient.findFirst();

  if (!doctor || !patient) {
    console.log("Need at least 1 doctor and 1 patient");
    return;
  }

  const date = new Date();
  date.setDate(date.getDate() + 2); // Two days from now, to avoid "EXPIRED" time slot issues
  const dateString = date.toISOString().split("T")[0];
  
  // Use the doctor's consult start time for the target slot
  const slotStartTime = doctor.consultStartTime;
  
  // Let's create an appointment for each remote system, using DIFFERENT doctors but SAME slot
  // Why? If we use the same doctor, the doctor's slot gets BOOKED after 1 appointment.
  // We need the remote systems to be full, while Dr. James Brown's slot remains available, 
  // OR we just use other doctors to fill the remote systems.
  
  const allDoctors = await prisma.doctor.findMany({ take: activeSystems.length });
  
  for (let i = 0; i < activeSystems.length; i++) {
    const sys = activeSystems[i];
    const doc = allDoctors[i];
    if (!doc) continue; // skip if not enough doctors

    // Create an appointment for this system & slot
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        patientName: patient.name,
        doctorId: doc.id,
        appointmentDate: dateString,
        slotStartTime: slotStartTime,
        slotEndTime: doctor.consultEndTime, // rough
        status: "BOOKED",
        remoteSystemId: sys.id,
      }
    });
    console.log(`Scheduled doc ${doc.name} to system ${sys.name} at ${slotStartTime}`);
  }

  console.log(`All ${activeSystems.length} systems are now occupied at ${slotStartTime} on ${dateString}`);
  console.log(`To test the conflict, book another appointment on ${dateString} at ${slotStartTime} with a DIFFERENT doctor.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
