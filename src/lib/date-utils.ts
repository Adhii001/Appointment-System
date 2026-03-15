import { format } from "date-fns";

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Get tomorrow's date as YYYY-MM-DD string.
 */
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return format(tomorrow, "yyyy-MM-dd");
}
