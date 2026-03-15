-- CreateTable
CREATE TABLE "ConsultationSystem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "systemName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL DEFAULT '',
    "doctorId" INTEGER NOT NULL,
    "appointmentDate" TEXT NOT NULL,
    "slotStartTime" TEXT NOT NULL DEFAULT '10:00',
    "slotEndTime" TEXT NOT NULL DEFAULT '10:30',
    "consultationSystemId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_consultationSystemId_fkey" FOREIGN KEY ("consultationSystemId") REFERENCES "ConsultationSystem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("appointmentDate", "createdAt", "doctorId", "id", "patientId", "patientName", "slotEndTime", "slotStartTime", "status") SELECT "appointmentDate", "createdAt", "doctorId", "id", "patientId", "patientName", "slotEndTime", "slotStartTime", "status" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");
CREATE INDEX "Appointment_doctorId_appointmentDate_slotStartTime_idx" ON "Appointment"("doctorId", "appointmentDate", "slotStartTime");
CREATE INDEX "Appointment_appointmentDate_slotStartTime_idx" ON "Appointment"("appointmentDate", "slotStartTime");
CREATE UNIQUE INDEX "Appointment_appointmentDate_slotStartTime_consultationSystemId_key" ON "Appointment"("appointmentDate", "slotStartTime", "consultationSystemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
