import { Server as SocketIOServer } from "socket.io";

/**
 * Emit a real-time event to all connected clients.
 * Used after appointment creation or doctor time updates.
 */
export function emitDoctorUpdate() {
  const io = (globalThis as Record<string, unknown>).__io as SocketIOServer | undefined;
  if (io) {
    io.emit("doctors-updated");
  }
}
