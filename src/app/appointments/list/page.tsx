"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";

interface Appointment {
  id: number;
  patientName: string;
  patientId: number;
  doctorId: number;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  createdAt: string;
  patient: { id: number; name: string; phone: string; age: number };
  doctor: { id: number; name: string };
}

interface Doctor {
  id: number;
  name: string;
}

export default function AppointmentsListPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Quick filter presets
  const [activePreset, setActivePreset] = useState<string>("all");

  const today = new Date().toISOString().split("T")[0];

  const fetchAppointments = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDoctor) params.set("doctorId", filterDoctor);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);

    const res = await fetch(`/api/appointments?${params.toString()}`);
    const data = await res.json();
    setAppointments(data);
    setLoading(false);
  }, [filterDoctor, filterDateFrom, filterDateTo]);

  const fetchDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    setDoctors(await res.json());
  }, []);

  // Real-time: re-fetch whenever any appointment is booked
  useSocket(fetchAppointments);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // Quick preset handlers
  function applyPreset(preset: string) {
    setActivePreset(preset);
    const todayStr = today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    switch (preset) {
      case "today":
        setFilterDateFrom(todayStr);
        setFilterDateTo(todayStr);
        break;
      case "tomorrow":
        setFilterDateFrom(tomorrowStr);
        setFilterDateTo(tomorrowStr);
        break;
      case "week": {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        setFilterDateFrom(todayStr);
        setFilterDateTo(weekEnd.toISOString().split("T")[0]);
        break;
      }
      case "month": {
        const monthEnd = new Date();
        monthEnd.setDate(monthEnd.getDate() + 30);
        setFilterDateFrom(todayStr);
        setFilterDateTo(monthEnd.toISOString().split("T")[0]);
        break;
      }
      case "past": {
        setFilterDateFrom("");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setFilterDateTo(yesterday.toISOString().split("T")[0]);
        break;
      }
      default:
        setFilterDateFrom("");
        setFilterDateTo("");
        break;
    }
  }

  function clearFilters() {
    setFilterDoctor("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSearch("");
    setActivePreset("all");
  }

  // Client-side text search on top of server-filtered results
  const filtered = filterSearch
    ? appointments.filter(
        (a) =>
          a.patient.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
          a.doctor.name.toLowerCase().includes(filterSearch.toLowerCase())
      )
    : appointments;

  // Group by date for better display
  const grouped = filtered.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointmentDate]) acc[apt.appointmentDate] = [];
    acc[apt.appointmentDate].push(apt);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  const hasActiveFilters = filterDoctor || filterDateFrom || filterDateTo || filterSearch;

  return (
    <div>
      {/* Back link */}
      <a href="/home" className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-800 font-medium mb-4 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </a>

      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">All Appointments</h1>
        <p className="text-cyan-600/70 mt-1">
          View and filter all booked appointments — updates in real time
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl p-4 text-white shadow-lg shadow-cyan-200/40 card-hover animate-fade-in-up">
          <div className="text-cyan-100 text-xs font-medium uppercase tracking-wider">Total Shown</div>
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 text-white shadow-lg shadow-teal-200/40 card-hover animate-fade-in-up">
          <div className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Today</div>
          <div className="text-2xl font-bold mt-1">
            {filtered.filter((a) => a.appointmentDate === today).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl p-4 text-white shadow-lg shadow-cyan-200/40 card-hover animate-fade-in-up">
          <div className="text-cyan-100 text-xs font-medium uppercase tracking-wider">Upcoming</div>
          <div className="text-2xl font-bold mt-1">
            {filtered.filter((a) => a.appointmentDate > today).length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl p-4 text-white shadow-lg shadow-teal-200/40 card-hover animate-fade-in-up">
          <div className="text-teal-100 text-xs font-medium uppercase tracking-wider">Total Minutes</div>
          <div className="text-2xl font-bold mt-1">
            {filtered.reduce((sum, a) => sum + getSlotMinutes(a.slotStartTime, a.slotEndTime), 0)}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-card rounded-2xl p-5 mb-6 shadow-lg shadow-cyan-100/30 relative z-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-cyan-700 uppercase tracking-wider">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium transition"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Quick preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all", label: "All" },
            { key: "today", label: "Today" },
            { key: "tomorrow", label: "Tomorrow" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "past", label: "Past" },
          ].map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activePreset === preset.key
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-200/50"
                  : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative z-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search patient or doctor..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-cyan-200 rounded-xl text-sm bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
            />
          </div>

          <div className="relative z-30">
            <SearchableSelect
              options={[
                { value: "", label: "All Doctors" },
                ...doctors.map(d => ({ value: d.id, label: d.name }))
              ]}
              value={filterDoctor}
              onChange={(val) => { setFilterDoctor(String(val)); setActivePreset(""); }}
              placeholder="All Doctors"
            />
          </div>

          {/* Date From */}
          <div className="relative z-20">
            <DatePicker
              value={filterDateFrom}
              onChange={(val) => { setFilterDateFrom(val); setActivePreset(""); }}
              placeholder="From date"
            />
          </div>

          {/* Date To */}
          <div className="relative z-10">
            <DatePicker
              value={filterDateTo}
              onChange={(val) => { setFilterDateTo(val); setActivePreset(""); }}
              placeholder="To date"
            />
          </div>
        </div>
      </div>

      {/* Appointments — grouped by date */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="flex items-center gap-3 text-cyan-600">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading appointments...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl shadow-lg shadow-cyan-100/30">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-cyan-700 text-lg font-medium">No appointments found</p>
          <p className="text-cyan-500/70 text-sm mt-1">Try adjusting your filters or book a new appointment</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const isToday = date === today;
            const isFuture = date > today;
            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-bold text-cyan-800 uppercase tracking-wider">
                    {formatDateHeader(date)}
                  </h3>
                  {isToday && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-sm">
                      TODAY
                    </span>
                  )}
                  {isFuture && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
                      UPCOMING
                    </span>
                  )}
                  {!isToday && !isFuture && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                      PAST
                    </span>
                  )}
                  <span className="text-xs text-cyan-400">
                    {grouped[date].length} appointment{grouped[date].length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Appointment cards */}
                <div className="space-y-2">
                  {grouped[date].map((apt) => (
                    <div
                      key={apt.id}
                      className={`glass-card rounded-2xl p-4 flex items-center justify-between hover:shadow-lg hover:shadow-cyan-100/40 transition-all ${
                        isToday
                          ? "border-l-4 border-l-cyan-500"
                          : isFuture
                          ? "border-l-4 border-l-teal-400"
                          : "border-l-4 border-l-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            isToday
                              ? "bg-gradient-to-br from-cyan-400 to-teal-500 text-white"
                              : isFuture
                              ? "bg-gradient-to-br from-teal-400 to-emerald-400 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {apt.patient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{apt.patient.name}</div>
                          <div className="text-sm text-gray-500">
                            {apt.patient.phone} &middot; Age {apt.patient.age}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium text-cyan-800">{apt.doctor.name}</div>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700"
                          >
                            🕐 {apt.slotStartTime} - {apt.slotEndTime}
                          </span>
                          <span className="text-xs text-gray-400">
                            #{apt.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 glass-card rounded-full px-4 py-2 shadow-lg shadow-cyan-200/30">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
        </span>
        <span className="text-xs font-medium text-cyan-700">Live</span>
      </div>
    </div>
  );
}

/** Format a YYYY-MM-DD string into a readable date header */
function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getSlotMinutes(start: string, end: string): number {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return 0;
  return Math.max((endH * 60 + endM) - (startH * 60 + startM), 0);
}
