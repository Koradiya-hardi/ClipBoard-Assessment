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

interface Workplace {
  id: number;
  name: string;
  location: string;
}

interface WorkplaceWithShiftCount {
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

async function fetchWorkplace(id: number): Promise<Workplace> {
  const response = await fetch(`http://localhost:3000/workplaces/${id}`);
  const data = await response.json() as { data: Workplace };
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
    
    // Count shifts per workplace
    const workplaceShiftCounts = new Map<number, number>();
    
    for (const shift of completedShifts) {
      const count = workplaceShiftCounts.get(shift.workplaceId) || 0;
      workplaceShiftCounts.set(shift.workplaceId, count + 1);
    }console.error(`Found ${workplaceShiftCounts.size} workplaces with completed shifts`);
    
    // Fetch workplace details and build result array
    const workplacePromises = Array.from(workplaceShiftCounts.entries()).map(
      async ([workplaceId, shiftCount]) => {
        try {
          const workplace = await fetchWorkplace(workplaceId);
          return {
            name: workplace.name,
            shifts: shiftCount
          };
        } catch (error) {
          console.error(`Failed to fetch workplace ${workplaceId}:`, error);
          return null;
        }
      }
    );
    const results = await Promise.all(workplacePromises);
    const validResults = results.filter((r): r is WorkplaceWithShiftCount => r !== null);
    
    // Sort by shift count descending and take top 3
    const topWorkplaces = validResults
      .sort((a, b) => b.shifts - a.shifts)
      .slice(0, 3);
    
    // Output only the JSON to stdout (as required)
    console.log(JSON.stringify(topWorkplaces));
    
  } catch (error) {
    console.error('Error fetching top workplaces:', error);
    process.exit(1);
  }
}

main();