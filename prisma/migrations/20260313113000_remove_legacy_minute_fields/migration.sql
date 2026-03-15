PRAGMA foreign_keys=OFF;

-- Rebuild Doctor table without legacy minute-based columns
CREATE TABLE "new_Doctor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "consultStartTime" TEXT NOT NULL DEFAULT '10:00',
    "consultEndTime" TEXT NOT NULL DEFAULT '16:00',
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Doctor" ("id", "name", "consultStartTime", "consultEndTime", "slotDuration", "createdAt")
SELECT "id", "name", "consultStartTime", "consultEndTime", "slotDuration", "createdAt"
FROM "Doctor";

DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";

-- Rebuild Appointment table without legacy durationMinutes
CREATE TABLE "new_Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL DEFAULT '',
    "doctorId" INTEGER NOT NULL,
    "appointmentDate" TEXT NOT NULL,
    "slotStartTime" TEXT NOT NULL DEFAULT '10:00',
    "slotEndTime" TEXT NOT NULL DEFAULT '10:30',
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Appointment" ("id", "patientId", "patientName", "doctorId", "appointmentDate", "slotStartTime", "slotEndTime", "status", "createdAt")
SELECT "id", "patientId", "patientName", "doctorId", "appointmentDate", "slotStartTime", "slotEndTime", "status", "createdAt"
FROM "Appointment";

DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";

CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");
CREATE INDEX "Appointment_doctorId_appointmentDate_slotStartTime_idx" ON "Appointment"("doctorId", "appointmentDate", "slotStartTime");

PRAGMA foreign_keys=ON;
