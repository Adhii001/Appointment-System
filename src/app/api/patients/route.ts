import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/patients - List all patients
export async function GET() {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(patients);
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, age } = body;

  if (!name || !phone || !age) {
    return NextResponse.json(
      { error: "Name, phone, and age are required" },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.create({
    data: {
      name: String(name),
      phone: String(phone),
      age: Number(age),
    },
  });

  return NextResponse.json(patient, { status: 201 });
}
