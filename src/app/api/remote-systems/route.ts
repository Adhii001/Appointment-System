import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emitDoctorUpdate } from "@/lib/socket-server";

// GET /api/remote-systems — list all remote systems with today's assignment count
export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const systems = await prisma.remoteSystem.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: {
        select: {
          appointments: {
            where: {
              appointmentDate: today,
              status: "BOOKED",
            },
          } as never,
        },
      },
    },
  });

  // Prisma _count with where filter on relations requires raw approach;
  // fall back to manual count for accuracy
  const systemsWithCounts = await Promise.all(
    systems.map(async (sys) => {
      const todayCount = await prisma.appointment.count({
        where: {
          remoteSystemId: sys.id,
          appointmentDate: today,
          status: "BOOKED",
        },
      });
      return {
        id: sys.id,
        name: sys.name,
        location: sys.location,
        isActive: sys.isActive,
        createdAt: sys.createdAt,
        todayAppointments: todayCount,
      };
    })
  );

  return NextResponse.json(systemsWithCounts);
}

// POST /api/remote-systems — create a new remote system
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, location } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const system = await prisma.remoteSystem.create({
    data: {
      name: name.trim(),
      location: typeof location === "string" ? location.trim() : "",
      isActive: true,
    },
  });

  emitDoctorUpdate();

  return NextResponse.json(system, { status: 201 });
}
