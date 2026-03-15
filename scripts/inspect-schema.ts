import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TableInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

async function main() {
  const doctorCols = await prisma.$queryRaw<TableInfo[]>`PRAGMA table_info('Doctor')`;
  const appointmentCols = await prisma.$queryRaw<TableInfo[]>`PRAGMA table_info('Appointment')`;

  console.log("Doctor columns:", doctorCols.map((c) => c.name));
  console.log("Appointment columns:", appointmentCols.map((c) => c.name));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
