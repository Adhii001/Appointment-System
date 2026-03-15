"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Hook that listens for real-time "doctors-updated" events from the server.
 * When an appointment is created by any user, all clients get notified
 * and can re-fetch doctor data to show updated remaining times.
 */
export function useSocket(onDoctorsUpdated: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onDoctorsUpdated);
  callbackRef.current = onDoctorsUpdated;

  useEffect(() => {
    const socket = io({
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    socketRef.current = socket;

    socket.on("doctors-updated", () => {
      callbackRef.current();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitRefresh = useCallback(() => {
    socketRef.current?.emit("request-refresh");
  }, []);

  return { emitRefresh };
}
