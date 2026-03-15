-- Add slot configuration fields to doctors
ALTER TABLE "Doctor" ADD COLUMN "consultStartTime" TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE "Doctor" ADD COLUMN "consultEndTime" TEXT NOT NULL DEFAULT '16:00';
ALTER TABLE "Doctor" ADD COLUMN "slotDuration" INTEGER NOT NULL DEFAULT 30;

-- Add slot columns to appointments
ALTER TABLE "Appointment" ADD COLUMN "slotStartTime" TEXT NOT NULL DEFAULT '10:00';
ALTER TABLE "Appointment" ADD COLUMN "slotEndTime" TEXT NOT NULL DEFAULT '10:30';
ALTER TABLE "Appointment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'BOOKED';

-- Indexes to speed up slot lookups and per-date summaries
CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");
CREATE INDEX "Appointment_doctorId_appointmentDate_slotStartTime_idx" ON "Appointment"("doctorId", "appointmentDate", "slotStartTime");
