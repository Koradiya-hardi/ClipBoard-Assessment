import type { Shift } from "@prisma/client";

import { omitShard } from "../shared/pagination";
import type { ShiftDTO } from "./shifts.schemas";

export function toShiftDTO(shift: Shift): ShiftDTO {
  const { createdAt, startAt, endAt, cancelledAt, ...rest } = omitShard(shift);
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    cancelledAt: cancelledAt?.toISOString() ?? null,
  };
}
