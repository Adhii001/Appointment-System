"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";

interface DoctorToday {
  id: number;
  name: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

interface Stats {
  totalDoctors: number;
  totalPatients: number;
  todayAppointments: number;
  monthAppointments: number;
  upcomingAppointments: number;
  availableDoctors: number;
  fullDoctors: number;
  doctorsToday: DoctorToday[];
  recentAppointments: Array<{
    id: number;
    appointmentDate: string;
    slotStartTime: string;
    slotEndTime: string;
    patient: { name: string };
    doctor: { name: string };
  }>;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent: "cyan" | "teal" | "amber" | "emerald" | "rose" | "violet";
}) {
  const bg: Record<string, string> = {
    cyan: "bg-cyan-100",
    teal: "bg-teal-100",
    amber: "bg-amber-100",
    emerald: "bg-emerald-100",
    rose: "bg-rose-100",
    violet: "bg-violet-100",
  };
  const text: Record<string, string> = {
    cyan: "text-cyan-600",
    teal: "text-teal-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    rose: "text-rose-500",
    violet: "text-violet-600",
  };
  const value_text: Record<string, string> = {
    cyan: "text-cyan-800",
    teal: "text-teal-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    rose: "text-rose-600",
    violet: "text-violet-700",
  };

  return (
    <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 card-hover">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl ${bg[accent]} ${text[accent]} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-bold ${value_text[accent]}`}>{value}</div>
      <div className={`text-sm ${text[accent]} mt-1 font-medium`}>{label}</div>
      {sub && <div className="text-xs text-cyan-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    const res = await fetch("/api/stats");
    const data = await res.json();
    setStats(data);
    setLoading(false);
  }

  useSocket(fetchStats);

  useEffect(() => {
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const now = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="text-xs text-violet-600 font-semibold uppercase tracking-wider">
              Admin
            </span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-sm text-cyan-500 mt-1">
            {today} · {now}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/doctors"
            className="px-4 py-2.5 btn-primary text-sm font-semibold rounded-xl shadow-md shadow-cyan-200/50 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Doctor
          </Link>
          <Link
            href="/admin/patients"
            className="px-4 py-2.5 glass-card text-cyan-700 text-sm font-semibold rounded-xl hover:bg-cyan-50 transition-colors flex items-center gap-2 border border-cyan-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Add Patient
          </Link>
          <Link
            href="/appointments"
            className="px-4 py-2.5 glass-card text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-2 border border-teal-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            New Appointment
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 text-cyan-500 py-16">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading statistics…</span>
        </div>
      ) : stats ? (
        <>
          {/* ── Stats grid ───────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger animate-fade-in-up">
            <StatCard
              label="Total Doctors"
              value={stats.totalDoctors}
              sub="registered physicians"
              accent="cyan"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Total Patients"
              value={stats.totalPatients}
              sub="registered patients"
              accent="teal"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Today's Appointments"
              value={stats.todayAppointments}
              sub="booked for today"
              accent="amber"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <StatCard
              label="This Month"
              value={stats.monthAppointments}
              sub="appointments booked"
              accent="violet"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger animate-fade-in-up">
            <StatCard
              label="Available Today"
              value={stats.availableDoctors}
              sub="doctors with open slots"
              accent="emerald"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Fully Booked"
              value={stats.fullDoctors}
              sub="doctors at capacity"
              accent="rose"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              label="Upcoming"
              value={stats.upcomingAppointments}
              sub="future appointments"
              accent="cyan"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* ── Doctor availability today ─────────────────── */}
          {stats.doctorsToday && stats.doctorsToday.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30 animate-fade-in-up">
              <div className="px-5 py-4 border-b border-cyan-100/50 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-cyan-800">
                    Doctor Availability Today
                  </h2>
                  <p className="text-xs text-cyan-400 mt-0.5">
                    Slot utilization per doctor
                  </p>
                </div>
                <Link
                  href="/home"
                  className="text-sm text-cyan-600 hover:underline font-medium"
                >
                  Slot Dashboard →
                </Link>
              </div>
              <div className="divide-y divide-cyan-50/60">
                {stats.doctorsToday.map((doc) => {
                  const pct = Math.round(
                    (doc.bookedSlots / Math.max(doc.totalSlots, 1)) * 100
                  );
                  const barColor =
                    pct >= 80
                      ? "bg-rose-400"
                      : pct >= 50
                      ? "bg-amber-400"
                      : "bg-emerald-400";
                  const badgeColor =
                    pct >= 80
                      ? "bg-rose-100 text-rose-600"
                      : pct >= 50
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-700";

                  return (
                    <div key={doc.id} className="px-5 py-4 hover:bg-cyan-50/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                            {getInitials(doc.name)}
                          </div>
                          <div>
                            <div className="font-medium text-cyan-900 text-sm">
                              {doc.name}
                            </div>
                            <div className="text-xs text-cyan-400 mt-0.5">
                              {doc.bookedSlots}/{doc.totalSlots} slots booked
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeColor}`}
                          >
                            {pct}%
                          </span>
                          {doc.availableSlots === 0 ? (
                            <span className="text-xs text-rose-500 font-medium">
                              Full
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 font-medium">
                              {doc.availableSlots} free
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-cyan-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 animate-progress ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Recent bookings ───────────────────────────── */}
          <div className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30 animate-fade-in-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-100/50">
              <div>
                <h2 className="font-semibold text-cyan-800">Recent Bookings</h2>
                <p className="text-xs text-cyan-400 mt-0.5">
                  Latest appointment activity
                </p>
              </div>
              <Link
                href="/admin/appointments"
                className="text-sm text-cyan-600 hover:underline font-medium"
              >
                View all →
              </Link>
            </div>

            {stats.recentAppointments.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-cyan-400 text-sm">No appointments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-cyan-50/60">
                {stats.recentAppointments.map((appt, i) => (
                  <div
                    key={appt.id}
                    className="px-5 py-4 flex items-center gap-4 hover:bg-cyan-50/30 transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {/* Patient avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                      {getInitials(appt.patient.name)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-cyan-900 text-sm truncate">
                          {appt.patient.name}
                        </span>
                        <span className="text-cyan-400 text-xs">→</span>
                        <span className="text-cyan-600 text-sm font-medium truncate">
                          {appt.doctor.name}
                        </span>
                      </div>
                      <div className="text-xs text-cyan-400 mt-0.5 flex items-center gap-2">
                        <span>📅 {appt.appointmentDate}</span>
                        <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                        <span>
                          🕐 {formatTime12(appt.slotStartTime)} –{" "}
                          {formatTime12(appt.slotEndTime)}
                        </span>
                      </div>
                    </div>
                    {/* Status badge */}
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex-shrink-0">
                      Booked
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick links ───────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
            <Link
              href="/admin/doctors"
              className="glass-card rounded-2xl p-5 hover:shadow-lg hover:shadow-cyan-100/40 transition-all group card-hover"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white flex items-center justify-center mb-3 shadow-md shadow-cyan-200/50 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 group-hover:text-cyan-700 transition-colors">
                Manage Doctors
              </div>
              <div className="text-xs text-cyan-400 mt-1">
                Edit, add, or remove doctors
              </div>
              <div className="text-sm text-cyan-600 font-semibold mt-2">
                {stats.totalDoctors} doctors
              </div>
            </Link>

            <Link
              href="/admin/patients"
              className="glass-card rounded-2xl p-5 hover:shadow-lg hover:shadow-teal-100/40 transition-all group card-hover"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center mb-3 shadow-md shadow-teal-200/50 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                Manage Patients
              </div>
              <div className="text-xs text-cyan-400 mt-1">
                Edit, add, or remove patients
              </div>
              <div className="text-sm text-teal-600 font-semibold mt-2">
                {stats.totalPatients} patients
              </div>
            </Link>

            <Link
              href="/admin/appointments"
              className="glass-card rounded-2xl p-5 hover:shadow-lg hover:shadow-violet-100/40 transition-all group card-hover"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 text-white flex items-center justify-center mb-3 shadow-md shadow-violet-200/50 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                Manage Appointments
              </div>
              <div className="text-xs text-cyan-400 mt-1">
                View and cancel appointments
              </div>
              <div className="text-sm text-violet-600 font-semibold mt-2">
                {stats.todayAppointments} today
              </div>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
