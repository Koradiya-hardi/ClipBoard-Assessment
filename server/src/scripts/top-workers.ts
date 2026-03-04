import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Fetch completed shifts grouped by worker
    const completedShifts = await prisma.shift.findMany({
      where: {
        workerId: { not: null },
        cancelledAt: null,
        endAt: { lt: new Date() },
      },
      select: {
        workerId: true,
      },
    });

    // Count shifts per worker
    const countsMap = new Map<number, number>();
    for (const shift of completedShifts) {
      const workerId = shift.workerId!;
      countsMap.set(workerId, (countsMap.get(workerId) || 0) + 1);
    }

    // Fetch worker names
    const workers = await prisma.worker.findMany({
      where: { id: { in: Array.from(countsMap.keys()) } },
      select: { id: true, name: true },
    });

    // Build results
    const results = workers.map((w: { name: any; id: number; }) => ({
      name: w.name,
      shifts: countsMap.get(w.id) || 0,
    }));

    // Sort descending and take top 3
    const top3 = results.sort((a: { shifts: number; }, b: { shifts: number; }) => b.shifts - a.shifts).slice(0, 3);

    console.log(JSON.stringify(top3));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
