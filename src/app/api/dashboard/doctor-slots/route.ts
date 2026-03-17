import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodayDateString } from "@/lib/date-utils";
import { generateSlots } from "@/lib/slot-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorIdParam = searchParams.get("doctorId");
  const date = searchParams.get("date") || getTodayDateString();

  if (!doctorIdParam) {
    return NextResponse.json(
      { error: "doctorId query parameter is required" },
      { status: 400 }
    );
  }

  const doctorId = Number(doctorIdParam);
  if (Number.isNaN(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID" }, { status: 400 });
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const slots = generateSlots(
    doctor.consultStartTime,
    doctor.consultEndTime,
    doctor.slotDuration
  );

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: date,
      status: { in: ["BOOKED", "IN_PROGRESS", "COMPLETED"] },
    },
    select: {
      id: true,
      slotStartTime: true,
      slotEndTime: true,
      status: true,
      patient: { select: { id: true, name: true, phone: true } },
    },
  });

  const bookedMap = new Map(
    bookedAppointments.map((item) => [item.slotStartTime, item])
  );

  const isToday = date === getTodayDateString();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slotBreakdown = slots.map((slot) => {
    const booked = bookedMap.get(slot.start);

    let status: string;
    if (booked) {
      status = booked.status;
    } else if (isToday) {
      const [sh, sm] = slot.start.split(":").map(Number);
      const [eh, em] = slot.end.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const slotDuration = endMin - startMin;
      const cutoffMin = startMin + Math.floor(slotDuration * (2 / 3));

      if (nowMinutes >= cutoffMin) {
        status = "EXPIRED";
      } else {
        status = "AVAILABLE";
      }
    } else {
      status = "AVAILABLE";
    }

    return {
      slotStartTime: slot.start,
      slotEndTime: slot.end,
      status,
      appointmentId: booked?.id ?? null,
      patient: booked?.patient ?? null,
    };
  });

  const bookedSlots = slotBreakdown.filter(
    (s) =>
      s.status === "BOOKED" ||
      s.status === "IN_PROGRESS" ||
      s.status === "COMPLETED"
  ).length;
  const expiredSlots = slotBreakdown.filter((s) => s.status === "EXPIRED").length;
  const totalSlots = slotBreakdown.length;

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      consultStartTime: doctor.consultStartTime,
      consultEndTime: doctor.consultEndTime,
      slotDuration: doctor.slotDuration,
    },
    date,
    totalSlots,
    bookedSlots,
    expiredSlots,
    availableSlots: totalSlots - bookedSlots - expiredSlots,
    slots: slotBreakdown,
  });
}
