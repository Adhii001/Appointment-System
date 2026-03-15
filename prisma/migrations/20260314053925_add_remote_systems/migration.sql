/*
  Warnings:

  - You are about to drop the `ConsultationSystem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `consultationSystemId` on the `Appointment` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConsultationSystem";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "RemoteSystem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "remoteSystemId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_remoteSystemId_fkey" FOREIGN KEY ("remoteSystemId") REFERENCES "RemoteSystem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("appointmentDate", "createdAt", "doctorId", "id", "patientId", "patientName", "slotEndTime", "slotStartTime", "status") SELECT "appointmentDate", "createdAt", "doctorId", "id", "patientId", "patientName", "slotEndTime", "slotStartTime", "status" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");
CREATE INDEX "Appointment_doctorId_appointmentDate_slotStartTime_idx" ON "Appointment"("doctorId", "appointmentDate", "slotStartTime");
CREATE INDEX "Appointment_remoteSystemId_appointmentDate_idx" ON "Appointment"("remoteSystemId", "appointmentDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
