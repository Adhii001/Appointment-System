"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface MonitorAppointment {
  id: number;
  patientName: string;
  doctorName: string;
  slotStartTime: string;
  slotEndTime: string;
  status: string;
}

interface MonitorSystem {
  id: number;
  name: string;
  location: string;
  appointments: MonitorAppointment[];
}

interface MonitorData {
  systems: MonitorSystem[];
  unassignedCount: number;
  date: string;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Given the current time, determine if a slot is past, active, or upcoming */
function getSlotState(start: string, end: string): "past" | "active" | "upcoming" {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (nowMinutes >= endMin) return "past";
  if (nowMinutes >= startMin && nowMinutes < endMin) return "active";
  return "upcoming";
}

const systemColors = [
  { gradient: "from-indigo-400 to-violet-500", shadow: "shadow-indigo-200/50", border: "border-indigo-200", bg: "bg-indigo-50/40" },
  { gradient: "from-cyan-400 to-teal-500", shadow: "shadow-cyan-200/50", border: "border-cyan-200", bg: "bg-cyan-50/40" },
  { gradient: "from-amber-400 to-orange-500", shadow: "shadow-amber-200/50", border: "border-amber-200", bg: "bg-amber-50/40" },
  { gradient: "from-emerald-400 to-green-500", shadow: "shadow-emerald-200/50", border: "border-emerald-200", bg: "bg-emerald-50/40" },
  { gradient: "from-rose-400 to-pink-500", shadow: "shadow-rose-200/50", border: "border-rose-200", bg: "bg-rose-50/40" },
  { gradient: "from-violet-400 to-purple-500", shadow: "shadow-violet-200/50", border: "border-violet-200", bg: "bg-violet-50/40" },
];

export default function ConsultationMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchMonitor() {
    const res = await fetch("/api/consultation-monitor");
    const json = await res.json();
    setData(json);
    setLoading(false);
    setLastRefresh(new Date());
  }

  useSocket(fetchMonitor);
  useEffect(() => { fetchMonitor(); }, []);

  // Auto-refresh every 30s to update slot states
  useEffect(() => {
    const interval = setInterval(fetchMonitor, 30000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 text-cyan-500 py-16">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading consultation monitor…</span>
      </div>
    );
  }

  if (!data) return null;

  const totalAppointments = data.systems.reduce((sum, s) => sum + s.appointments.length, 0);
  const activeNow = data.systems.reduce(
    (sum, s) => sum + s.appointments.filter((a) => getSlotState(a.slotStartTime, a.slotEndTime) === "active").length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
              Live Monitor
            </span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
            Consultation Monitor
          </h1>
          <p className="text-sm text-cyan-500 mt-1">
            {today} · {now}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="glass-card rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-cyan-500">Active:</span>
            <span className="font-bold text-cyan-800">{activeNow}</span>
          </div>
          <div className="glass-card rounded-xl px-4 py-2.5 text-sm">
            <span className="text-cyan-500">Total:</span>{" "}
            <span className="font-bold text-cyan-800">{totalAppointments}</span>
            <span className="text-cyan-400"> consultations</span>
          </div>
          {data.unassignedCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-amber-600 font-semibold">⚠ {data.unassignedCount}</span>
              <span className="text-amber-500"> unassigned</span>
            </div>
          )}
          <div className="glass-card rounded-xl px-3 py-2.5 text-xs text-cyan-400 flex items-center gap-1">
            🔄 {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
          </div>
        </div>
      </div>

      {/* System Cards Grid */}
      {data.systems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📺</span>
          </div>
          <p className="text-cyan-600 font-medium">No active remote systems</p>
          <p className="text-cyan-400 text-sm mt-1">
            Add and activate remote systems from the{" "}
            <a href="/admin/remote-systems" className="text-cyan-600 hover:underline font-semibold">
              Remote Systems
            </a>{" "}
            page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 stagger animate-fade-in-up">
          {data.systems.map((sys, idx) => {
            const color = systemColors[idx % systemColors.length];
            const sysActiveNow = sys.appointments.filter(
              (a) => getSlotState(a.slotStartTime, a.slotEndTime) === "active"
            );

            return (
              <div
                key={sys.id}
                className={`glass-card rounded-2xl overflow-hidden shadow-md ${color.shadow} card-hover`}
              >
                {/* System Header */}
                <div className={`px-5 py-4 border-b ${color.border}/40`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.gradient} text-white text-lg flex items-center justify-center shadow-md ${color.shadow}`}
                    >
                      🖥️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-cyan-900 text-sm truncate">
                        {sys.name}
                      </div>
                      <div className="text-xs text-cyan-400 mt-0.5 flex items-center gap-1.5">
                        {sys.location && (
                          <>
                            <span>📍 {sys.location}</span>
                            <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                          </>
                        )}
                        <span>{sys.appointments.length} slot(s)</span>
                      </div>
                    </div>
                    {sysActiveNow.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Appointments List */}
                <div className="divide-y divide-cyan-50/60 max-h-[400px] overflow-y-auto">
                  {sys.appointments.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center mx-auto mb-2">
                        <span className="text-cyan-400 text-lg">📋</span>
                      </div>
                      <p className="text-cyan-400 text-xs font-medium">
                        No consultations assigned
                      </p>
                    </div>
                  ) : (
                    sys.appointments.map((appt) => {
                      const state = getSlotState(appt.slotStartTime, appt.slotEndTime);
                      const stateStyles = {
                        active: "bg-emerald-50/80 border-l-4 border-l-emerald-400",
                        upcoming: "bg-white/50",
                        past: "bg-gray-50/50 opacity-60",
                      };
                      const badgeStyles = {
                        active: "bg-emerald-100 text-emerald-700",
                        upcoming: "bg-cyan-100 text-cyan-700",
                        past: "bg-gray-200 text-gray-500",
                      };

                      return (
                        <div
                          key={appt.id}
                          className={`px-5 py-3.5 transition-colors ${stateStyles[state]}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${
                                state === "past"
                                  ? "bg-gray-300"
                                  : `bg-gradient-to-br ${color.gradient}`
                              }`}
                            >
                              {getInitials(appt.patientName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-cyan-900 text-xs truncate">
                                  {appt.patientName}
                                </span>
                                <span className="text-cyan-300 text-[10px]">→</span>
                                <span className="text-cyan-600 text-xs truncate">
                                  {appt.doctorName}
                                </span>
                              </div>
                              <div className="text-[11px] text-cyan-400 mt-0.5 flex items-center gap-1.5">
                                <span>
                                  🕐 {formatTime12(appt.slotStartTime)} –{" "}
                                  {formatTime12(appt.slotEndTime)}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyles[state]}`}
                            >
                              {state === "active"
                                ? "IN SESSION"
                                : state === "upcoming"
                                ? "UPCOMING"
                                : "COMPLETED"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Utilization Footer */}
                {sys.appointments.length > 0 && (
                  <div className={`px-5 py-3 ${color.bg} border-t ${color.border}/30`}>
                    <div className="flex items-center justify-between text-[11px] text-cyan-500 mb-1.5">
                      <span>Utilization</span>
                      <span className="font-semibold">{sys.appointments.length} consultation(s)</span>
                    </div>
                    <div className="h-1.5 bg-cyan-100/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${color.gradient} animate-progress`}
                        style={{
                          width: `${Math.min((sys.appointments.length / 12) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
