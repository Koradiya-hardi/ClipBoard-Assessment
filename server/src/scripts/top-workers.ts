// console.log("TODO: Implement me!");
import fetch from 'node-fetch';

interface Shift {
  id: number;
  startAt: string;
  endAt: string;
  workerId: number | null;
  workplaceId: number;
  jobType: string;
  createdAt: string;
  cancelledAt: string | null;
}

interface Worker {
  id: number;
  name: string;
}

interface WorkerWithShiftCount {
  name: string;
  shifts: number;
}

async function fetchAllPages<T>(baseUrl: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = baseUrl;
  
  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json() as { data: T[], links: { next?: string } };
    items.push(...data.data);
    nextUrl = data.links.next || null;
  }
  
  return items;
}

async function fetchWorker(id: number): Promise<Worker> {
  const response = await fetch(`http://localhost:3000/workers/${id}`);
  const data = await response.json() as { data: Worker };
  return data.data;
}

function isShiftCompleted(shift: Shift): boolean {
  // A shift is completed if:
  // 1. It has a worker assigned (in "My Booked Shifts")
  // 2. It's not cancelled
  // 3. The end time has passed (it's in the past)
  const now = new Date();
  const endAt = new Date(shift.endAt);
  
  return shift.workerId !== null && 
         shift.cancelledAt === null && 
         endAt < now;
}

async function main() {
  try {
    console.error('Fetching all shifts...'); // Using stderr for debug logs
    
    // Fetch all shifts (handles pagination automatically)
    const allShifts = await fetchAllPages<Shift>('http://localhost:3000/shifts');
    
    console.error(`Total shifts fetched: ${allShifts.length}`);
    
    // Filter for completed shifts
    const completedShifts = allShifts.filter(isShiftCompleted);
    
    console.error(`Completed shifts: ${completedShifts.length}`);
    
    // Count shifts per worker
    const workerShiftCounts = new Map<number, number>();
    
    for (const shift of completedShifts) {
      if (shift.workerId) {
        const count = workerShiftCounts.get(shift.workerId) || 0;
        workerShiftCounts.set(shift.workerId, count + 1);
      }
    }
    
    console.error(`Found ${workerShiftCounts.size} workers with completed shifts`);
    
    // Fetch worker details and build result array
    const workerPromises = Array.from(workerShiftCounts.entries()).map(
      async ([workerId, shiftCount]) => {
        try {
          const worker = await fetchWorker(workerId);
          return {
            name: worker.name,
            shifts: shiftCount
          };
        } catch (error) {
          console.error(`Failed to fetch worker ${workerId}:`, error);
          return null;
        }
      }
    );
    
    const results = await Promise.all(workerPromises);
    const validResults = results.filter((r): r is WorkerWithShiftCount => r !== null);
    
    // Sort by shift count descending and take top 3
    const topWorkers = validResults
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 3);
    
    // Output only the JSON to stdout (as required)
    console.log(JSON.stringify(topWorkers));
    
  } catch (error) {
    console.error('Error fetching top workers:', error);
    process.exit(1);
  }
}

main();