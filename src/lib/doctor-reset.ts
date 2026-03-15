/**
 * Legacy hook kept for backward compatibility.
 *
 * The system is now slot-based and availability is calculated from generated
 * slots and booked appointments per doctor/date, so no daily reset is needed.
 */
export async function resetDoctorTimesIfNeeded(): Promise<void> {
  return;
}
