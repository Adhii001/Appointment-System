import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resetDoctorTimesIfNeeded } from "@/lib/doctor-reset";
import { emitDoctorUpdate } from "@/lib/socket-server";
import { generateSlots } from "@/lib/slot-utils";

// GET /api/appointments - List all appointments with optional filters
// Query params: ?doctorId=1&patientId=2&dateFrom=2026-03-01&dateTo=2026-03-31&date=2026-03-12
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const patientId = searchParams.get("patientId");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};

  if (doctorId) where.doctorId = Number(doctorId);
  if (patientId) where.patientId = Number(patientId);

  if (date) {
    where.appointmentDate = date;
  } else if (dateFrom || dateTo) {
    where.appointmentDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { appointmentDate: "asc" },
  });
  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  await resetDoctorTimesIfNeeded();

  const body = await request.json();
  const { patientId, doctorId, appointmentDate, slotStartTime } = body;

  if (!patientId || !doctorId || !appointmentDate) {
    return NextResponse.json(
      { error: "patientId, doctorId, and appointmentDate are required" },
      { status: 400 }
    );
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: Number(doctorId) } });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: Number(patientId) } });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const slots = generateSlots(
    doctor.consultStartTime,
    doctor.consultEndTime,
    doctor.slotDuration
  );
  if (slots.length === 0) {
    return NextResponse.json(
      { error: "Doctor has invalid consulting hours configuration" },
      { status: 400 }
    );
  }

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      appointmentDate: String(appointmentDate),
      status: "BOOKED",
    },
    select: { slotStartTime: true },
  });
  const bookedSet = new Set(bookedAppointments.map((item) => item.slotStartTime));

  const availableSlots = slots.filter((slot) => !bookedSet.has(slot.start));

  let selectedSlot =
    typeof slotStartTime === "string" && slotStartTime.trim().length > 0
      ? slots.find((slot) => slot.start === slotStartTime)
      : availableSlots[0];

  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected slot is invalid" }, { status: 400 });
  }

  // ── Real-time slot validation: reject expired slots for today ──
  const today = new Date().toISOString().split("T")[0];
  if (String(appointmentDate) === today) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = selectedSlot.start.split(":").map(Number);
    const [eh, em] = selectedSlot.end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const slotDuration = endMin - startMin;
    const cutoffMin = startMin + Math.floor(slotDuration * (2 / 3));

    if (nowMinutes >= cutoffMin) {
      return NextResponse.json(
        {
          status: "slot_expired",
          error: `The time slot ${selectedSlot.start} - ${selectedSlot.end} has expired. Please select a later time slot.`,
        },
        { status: 400 }
      );
    }
  }

  if (bookedSet.has(selectedSlot.start)) {
    const allDoctors = await prisma.doctor.findMany({
      where: { id: { not: doctor.id } },
    });

    const alternatives = await Promise.all(
      allDoctors.map(async (d) => {
        const allSlots = generateSlots(d.consultStartTime, d.consultEndTime, d.slotDuration);
        const booked = await prisma.appointment.findMany({
          where: {
            doctorId: d.id,
            appointmentDate: String(appointmentDate),
            status: "BOOKED",
          },
          select: { slotStartTime: true },
        });
        const count = new Set(booked.map((item) => item.slotStartTime)).size;
        const available = Math.max(allSlots.length - count, 0);
        return {
          id: d.id,
          name: d.name,
          totalSlots: allSlots.length,
          availableSlots: available,
        };
      })
    );

    const availableDoctors = alternatives
      .filter((d) => d.availableSlots > 0)
      .sort((a, b) => b.availableSlots - a.availableSlots);

    const current = new Date(String(appointmentDate));
    current.setDate(current.getDate() + 1);
    const nextDayStr = current.toISOString().split("T")[0];

    return NextResponse.json(
      {
        status: "doctor_full",
        message: `The slot ${selectedSlot.start} - ${selectedSlot.end} is already booked for ${doctor.name}.`,
        tomorrow: nextDayStr,
        targetDate: String(appointmentDate),
        availableDoctors,
      },
      { status: 409 }
    );
  }

  // ── Remote System Auto-Assignment ────────────────────────────
  let remoteSystemId: number | null = null;
  let remoteSystemWarning: string | null = null;
  let assignedSystem: { id: number; name: string; location: string } | null = null;

  const activeSystems = await prisma.remoteSystem.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  if (activeSystems.length === 0) {
    // No remote systems configured — allow booking but warn
    remoteSystemWarning = "No remote consultation systems available. Appointment created without system assignment.";
  } else {
    // Find which systems are already occupied at this slot on this date
    const occupiedSystems = await prisma.appointment.findMany({
      where: {
        appointmentDate: String(appointmentDate),
        slotStartTime: selectedSlot.start,
        status: "BOOKED",
        remoteSystemId: { not: null },
      },
      select: { remoteSystemId: true },
    });
    const occupiedIds = new Set(occupiedSystems.map((a) => a.remoteSystemId));

    const freeSystem = activeSystems.find((sys) => !occupiedIds.has(sys.id));

    if (!freeSystem) {
      // Find the next available slot for this doctor today where a remote system is free
      let nextAvailableSlot = null;

      for (let i = slots.findIndex(s => s.start === selectedSlot.start) + 1; i < slots.length; i++) {
        const checkSlot = slots[i];
        
        // Skip if this slot is already booked for the doctor
        if (bookedSet.has(checkSlot.start)) continue;

        // Skip if the slot is expired (for today)
        if (String(appointmentDate) === today) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const [sh, sm] = checkSlot.start.split(":").map(Number);
          const [eh, em] = checkSlot.end.split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          const cutoffMin = startMin + Math.floor((endMin - startMin) * (2 / 3));
          if (nowMinutes >= cutoffMin) continue;
        }

        // Check if a remote system is free at this slot
        const occupiedAtCheckSlot = await prisma.appointment.findMany({
          where: {
            appointmentDate: String(appointmentDate),
            slotStartTime: checkSlot.start,
            status: "BOOKED",
            remoteSystemId: { not: null },
          },
          select: { remoteSystemId: true },
        });
        const occupiedIdsAtCheckSlot = new Set(occupiedAtCheckSlot.map(a => a.remoteSystemId));
        
        const hasFreeSystem = activeSystems.some(sys => !occupiedIdsAtCheckSlot.has(sys.id));
        if (hasFreeSystem) {
          nextAvailableSlot = checkSlot.start;
          break;
        }
      }

      return NextResponse.json(
        {
          status: "systems_full",
          error: `All ${activeSystems.length} remote consultation system(s) are occupied from ${selectedSlot.start} to ${selectedSlot.end}.`,
          nextAvailableSlot,
        },
        { status: 409 }
      );
    }

    remoteSystemId = freeSystem.id;
    assignedSystem = { id: freeSystem.id, name: freeSystem.name, location: freeSystem.location };
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId: Number(patientId),
      patientName: patient.name,
      doctorId: doctor.id,
      appointmentDate: String(appointmentDate),
      slotStartTime: selectedSlot.start,
      slotEndTime: selectedSlot.end,
      status: "BOOKED",
      remoteSystemId,
    },
    include: {
      patient: true,
      doctor: true,
      remoteSystem: true,
    },
  });

  emitDoctorUpdate();

  return NextResponse.json(
    {
      status: "success",
      appointment,
      assignedSystem,
      ...(remoteSystemWarning ? { warning: remoteSystemWarning } : {}),
    },
    { status: 201 }
  );
}

