export interface TimeSlot {
  start: string;
  end: string;
}

export function parseTimeToMinutes(time: string): number {
  const parts = time.split(":");
  if (parts.length !== 2) return -1;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return -1;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;

  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function generateSlots(
  consultStartTime: string,
  consultEndTime: string,
  slotDuration: number
): TimeSlot[] {
  const start = parseTimeToMinutes(consultStartTime);
  const end = parseTimeToMinutes(consultEndTime);

  if (start < 0 || end < 0 || slotDuration <= 0 || end <= start) {
    return [];
  }

  const slots: TimeSlot[] = [];
  let cursor = start;

  while (cursor + slotDuration <= end) {
    slots.push({
      start: formatMinutesToTime(cursor),
      end: formatMinutesToTime(cursor + slotDuration),
    });
    cursor += slotDuration;
  }

  return slots;
}

export function validateConsultConfig(
  consultStartTime: string,
  consultEndTime: string,
  slotDuration: number
): string | null {
  const start = parseTimeToMinutes(consultStartTime);
  const end = parseTimeToMinutes(consultEndTime);

  if (start < 0 || end < 0) {
    return "Invalid time format. Use HH:mm (24-hour).";
  }

  if (!Number.isInteger(slotDuration) || slotDuration <= 0) {
    return "Slot duration must be a positive integer in minutes.";
  }

  if (end <= start) {
    return "Consult end time must be after consult start time.";
  }

  const totalMinutes = end - start;
  if (totalMinutes < slotDuration) {
    return "Consulting window must be at least one slot long.";
  }

  if (totalMinutes % slotDuration !== 0) {
    return "Consulting window must divide exactly by slot duration.";
  }

  return null;
}
