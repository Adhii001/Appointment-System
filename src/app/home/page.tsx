"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";

interface Patient {
  id: number;
  name: string;
  phone: string;
  age: number;
}

interface Doctor {
  id: number;
  name: string;
}

interface SlotBreakdown {
  slotStartTime: string;
  slotEndTime: string;
  status: "BOOKED" | "AVAILABLE" | "EXPIRED" | "IN_PROGRESS" | "COMPLETED";
  patient: { id: number; name: string; phone: string } | null;
}

interface DoctorSlotDashboard {
  doctor: {
    id: number;
    name: string;
    consultStartTime: string;
    consultEndTime: string;
    slotDuration: number;
  };
  date: string;
  totalSlots: number;
  bookedSlots: number;
  expiredSlots: number;
  availableSlots: number;
  slots: SlotBreakdown[];
}

interface ScheduleAppt {
  id: number;
  patientName: string;
  doctorName: string;
  slotStartTime: string;
  slotEndTime: string;
  status: string;
}

interface RemoteSystemSchedule {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  todayAppointments: ScheduleAppt[];
  tomorrowAppointments: ScheduleAppt[];
}

interface ConfirmedAppointment {
  id: number;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  patient: { name: string; phone: string; age: number };
  doctor: { name: string };
  remoteSystem: { name: string; location: string } | null;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function parseHour(time: string): number {
  return parseInt(time.split(":")[0], 10);
}

export default function HomePage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dashboard, setDashboard] = useState<DoctorSlotDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Remote systems state
  const [remoteSystems, setRemoteSystems] = useState<RemoteSystemSchedule[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<RemoteSystemSchedule | null>(null);

  // Confirmed appointment (inline success state)
  const [confirmedAppointment, setConfirmedAppointment] = useState<ConfirmedAppointment | null>(null);

  // Ref to suppress background refetches while modal is open
  const modalOpenRef = useRef(false);

  // Booking flow state
  const [bookingSlot, setBookingSlot] = useState<SlotBreakdown | null>(null);
  const [bookingPatient, setBookingPatient] = useState("");
  const [bookingStep, setBookingStep] = useState<"select" | "confirm">("select");
  const [submitting, setSubmitting] = useState(false);

  // Alert state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [systemFullError, setSystemFullError] = useState<{ message: string; nextSlot: string | null } | null>(null);

  const fetchPatients = useCallback(async () => {
    const res = await fetch("/api/patients");
    setPatients(await res.json());
  }, []);

  const fetchDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    const data: Doctor[] = await res.json();
    setDoctors(data);
    if (!selectedDoctor && data.length > 0) {
      setSelectedDoctor(String(data[0].id));
    }
    setLoading(false);
  }, [selectedDoctor]);

  const fetchSlotDashboard = useCallback(async () => {
    if (!selectedDoctor) { setDashboard(null); return; }
    setSlotsLoading(true);
    const res = await fetch(
      `/api/dashboard/doctor-slots?doctorId=${selectedDoctor}&date=${selectedDate}`
    );
    const data = await res.json();
    setSlotsLoading(false);
    if (res.ok) setDashboard(data);
    else setDashboard(null);
  }, [selectedDoctor, selectedDate]);

  const fetchRemoteSystems = useCallback(async () => {
    try {
      const res = await fetch("/api/remote-systems/schedules");
      if (res.ok) { const data = await res.json(); setRemoteSystems(data.systems); }
    } catch { /* ignore */ }
  }, []);

  useSocket(() => { if (!modalOpenRef.current) { fetchDoctors(); fetchSlotDashboard(); fetchRemoteSystems(); } });
  useEffect(() => { fetchDoctors(); fetchPatients(); fetchRemoteSystems(); }, [fetchDoctors, fetchPatients, fetchRemoteSystems]);
  useEffect(() => { fetchSlotDashboard(); }, [fetchSlotDashboard]);

  // Auto-dismiss alerts
  useEffect(() => { if (successMsg) { const t = setTimeout(() => setSuccessMsg(null), 8000); return () => clearTimeout(t); } }, [successMsg]);
  useEffect(() => { if (errorMsg) { const t = setTimeout(() => setErrorMsg(null), 10000); return () => clearTimeout(t); } }, [errorMsg]);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const bookableSlots = dashboard?.slots.filter((s) => s.status === "AVAILABLE") || [];
  const occupiedSlots = dashboard?.slots.filter((s) => ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(s.status)) || [];
  const expiredSlotsList = dashboard?.slots.filter((s) => s.status === "EXPIRED") || [];

  const totalSlots = dashboard?.totalSlots || 0;
  const bookedCount = occupiedSlots.length;
  const availableCount = bookableSlots.length;
  const expiredCount = expiredSlotsList.length;
  const utilization = totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0;
  const nextAvailable = bookableSlots[0];

  const formattedDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const futureSlots = dashboard?.slots.filter((s) => s.status !== "EXPIRED") || [];

  const groupedSlots = (() => {
    const morning: SlotBreakdown[] = [];
    const afternoon: SlotBreakdown[] = [];
    const evening: SlotBreakdown[] = [];
    for (const slot of futureSlots) {
      const h = parseHour(slot.slotStartTime);
      if (h < 12) morning.push(slot);
      else if (h < 17) afternoon.push(slot);
      else evening.push(slot);
    }
    return [
      { label: "Morning", icon: "🌅", range: "Before 12:00 PM", slots: morning },
      { label: "Afternoon", icon: "☀️", range: "12:00 – 5:00 PM", slots: afternoon },
      { label: "Evening", icon: "🌆", range: "After 5:00 PM", slots: evening },
    ].filter((g) => g.slots.length > 0);
  })();

  // ── Booking flow ──

  function openBookingModal(slot: SlotBreakdown) {
    if (slot.status !== "AVAILABLE" || !dashboard) return;
    modalOpenRef.current = true;
    setBookingSlot(slot);
    setBookingPatient("");
    setBookingStep("select");
    setConfirmedAppointment(null);
    setErrorMsg(null);
  }

  function closeBookingModal() {
    modalOpenRef.current = false;
    setBookingSlot(null);
    setBookingPatient("");
    setBookingStep("select");
    setSystemFullError(null);
    setConfirmedAppointment(null);
  }

  function closeAndRefresh() {
    closeBookingModal();
    fetchSlotDashboard();
    fetchRemoteSystems();
  }

  function proceedToConfirm() {
    if (!bookingPatient) return;
    setBookingStep("confirm");
  }

  async function confirmBooking() {
    if (!bookingSlot || !dashboard || !bookingPatient) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSystemFullError(null);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: Number(bookingPatient),
        doctorId: dashboard.doctor.id,
        appointmentDate: dashboard.date,
        slotStartTime: bookingSlot.slotStartTime,
      }),
    });

    const data = await res.json();

    if (data.status === "slot_expired") {
      setSubmitting(false);
      setErrorMsg(data.error || "This slot has expired.");
      closeBookingModal();
      fetchSlotDashboard();
      return;
    }

    if (res.status === 409) {
      setSubmitting(false);
      if (data.status === "systems_full") {
        setSystemFullError({
          message: data.error,
          nextSlot: data.nextAvailableSlot,
        });
        return;
      }
      setErrorMsg(data.error || data.message || "Booking conflict.");
      closeBookingModal();
      return;
    }

    if (res.ok) {
      setSubmitting(false);
      // Show inline success state — no page navigation
      setConfirmedAppointment(data.appointment);
    } else {
      setSubmitting(false);
      setErrorMsg(data.error || "Failed to book appointment");
      closeBookingModal();
    }
  }

  const selectedPatientObj = patients.find((p) => p.id === Number(bookingPatient));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-cyan-600">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-300/20 filter blur-[80px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-teal-300/20 filter blur-[80px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-sky-300/20 filter blur-[80px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="space-y-6 animate-fade-in-up relative z-10">

        {/* ── Header + Quick Nav ── */}
        <div className="glass-card rounded-3xl p-6 sm:px-8 border border-white/40 flex flex-wrap items-center justify-between gap-6 shadow-xl shadow-cyan-900/5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </span>
              <span className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Live System Status</span>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-800 to-teal-600 bg-clip-text text-transparent transform transition-all hover:scale-[1.01]">
              Appointment Dashboard
            </h1>
            <p className="text-cyan-700/80 text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {isToday ? "Showing today's future slots" : formattedDate}
            </p>
          </div>

          {/* Quick nav pills */}
          <div className="flex items-center gap-3">
            <a href="/appointments/list" className="flex items-center gap-2 px-5 py-2.5 bg-white/60 border border-cyan-200/50 rounded-2xl text-sm font-semibold text-cyan-700 hover:border-cyan-400 hover:bg-white hover:text-cyan-900 transition-all hover:shadow-lg hover:shadow-cyan-200/40 hover:-translate-y-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              All Appointments
            </a>
            <a href="/patients" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white border border-teal-400/50 rounded-2xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-teal-500/40 hover:-translate-y-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Add Patient
            </a>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-fade-in-down">
            <span className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-full flex items-center justify-center text-sm shadow-md">✓</span>
            <span className="text-sm font-medium text-emerald-800 flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 animate-fade-in-down">
            <span className="w-8 h-8 bg-gradient-to-br from-rose-400 to-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-md">✕</span>
            <span className="text-sm font-medium text-rose-800 flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}

        {/* ── Remote Systems Status Strip ── */}
        {remoteSystems.length > 0 && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Remote Systems</span>
              <span className="text-[10px] text-cyan-400">· click to view schedule</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {remoteSystems.map((sys, idx) => {
                const hasActive = sys.todayAppointments.some(a => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const [sh, sm] = a.slotStartTime.split(":").map(Number);
                  const [eh, em] = a.slotEndTime.split(":").map(Number);
                  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
                });
                const todayCount = sys.todayAppointments.length;
                const gradients = [
                  "from-indigo-400 to-violet-500",
                  "from-cyan-400 to-teal-500",
                  "from-amber-400 to-orange-500",
                  "from-emerald-400 to-green-500",
                  "from-rose-400 to-pink-500",
                ];
                const grad = gradients[idx % gradients.length];
                return (
                  <button
                    key={sys.id}
                    onClick={() => setSelectedSystem(sys)}
                    className="flex-shrink-0 glass-card rounded-2xl px-5 py-4 flex items-center gap-4 cursor-pointer border border-white/40 shadow-md shadow-cyan-900/5 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-200/30 hover:-translate-y-1 transition-all group min-w-[200px]"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-sm">🖥️</span>
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasActive ? "bg-emerald-400 animate-pulse" : todayCount > 0 ? "bg-cyan-400" : "bg-gray-300"}`} />
                        <span className="text-sm font-semibold text-cyan-900 truncate">{sys.name}</span>
                      </div>
                      <div className="text-[11px] text-cyan-400 mt-0.5">
                        {sys.location && <span>{sys.location} · </span>}
                        <span className="font-medium">{todayCount} today</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Controls Bar ── */}
        <div className="glass-card rounded-3xl p-6 border border-white/40 shadow-xl shadow-cyan-900/5 relative z-20">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6 md:gap-10">
            <div className="flex-1 w-full">
              <label className="block text-xs uppercase tracking-wider text-cyan-500 font-bold mb-3">Select Doctor</label>
              <div className="flex flex-wrap gap-2.5">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDoctor(String(d.id))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${String(d.id) === selectedDoctor
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-300/50 scale-[1.02]"
                      : "bg-white/60 text-cyan-700 border border-cyan-200/50 hover:border-cyan-400 hover:bg-white hover:shadow-md hover:shadow-cyan-100/40 hover:-translate-y-0.5"
                      }`}
                  >
                    <span className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center ${String(d.id) === selectedDoctor ? "bg-white/20 text-white" : "bg-gradient-to-br from-cyan-400 to-teal-500 text-white"
                      }`}>
                      {getInitials(d.name)}
                    </span>
                    <span className="hidden sm:inline">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-2 md:pl-6 md:border-l border-cyan-100/50">
              <div className="w-full">
                <label className="block text-xs uppercase tracking-wider text-cyan-500 font-bold mb-3">Date</label>
                <div className="flex items-center gap-2">
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    minDate={new Date().toISOString().split("T")[0]}
                    className="w-full sm:w-48"
                  />
                  {!isToday && (
                    <button
                      onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-600 border-2 border-cyan-200 rounded-xl hover:bg-cyan-50 transition-all shadow-sm"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {slotsLoading ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-cyan-500 text-sm">Loading slot data…</p>
          </div>
        ) : !dashboard ? (
          <div className="glass-card rounded-2xl p-16 text-center text-cyan-400 text-sm">
            No data available for the selected filter.
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 stagger">
              <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-lg shadow-cyan-900/5 card-hover">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-100 to-white border border-cyan-200/50 flex items-center justify-center shadow-inner">
                    <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-cyan-900">{totalSlots}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-cyan-500 mt-0.5">Total Slots</div>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-lg shadow-cyan-900/5 card-hover">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-100 to-white border border-rose-200/50 flex items-center justify-center shadow-inner">
                    <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-rose-600">{bookedCount}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mt-0.5">Booked</div>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-lg shadow-cyan-900/5 card-hover">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-white border border-emerald-200/50 flex items-center justify-center shadow-inner">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-emerald-600">{availableCount}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mt-0.5">Available</div>
                  </div>
                </div>
                {nextAvailable && (
                  <div className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 border border-emerald-200/50 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mt-2 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    Next: {formatTime12(nextAvailable.slotStartTime)}
                  </div>
                )}
              </div>
              {isToday && (
                <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-lg shadow-cyan-900/5 card-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-white border border-gray-200/50 flex items-center justify-center shadow-inner">
                      <span className="text-gray-500 text-lg">⏰</span>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-gray-400">{expiredCount}</div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">Expired</div>
                    </div>
                  </div>
                </div>
              )}
              <div className="glass-card rounded-3xl p-5 border border-white/40 shadow-lg shadow-cyan-900/5 card-hover">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-100 to-white border border-teal-200/50 flex items-center justify-center shadow-inner">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-teal-700">{utilization}%</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-teal-500 mt-0.5">Utilization</div>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full mt-2 inline-block border shadow-sm ${utilization >= 80 ? "text-rose-700 bg-rose-100/50 border-rose-200" : utilization >= 50 ? "text-amber-700 bg-amber-100/50 border-amber-200" : "text-emerald-700 bg-emerald-100/50 border-emerald-200"
                  }`}>
                  {utilization >= 80 ? "High Load" : utilization >= 50 ? "Moderate" : "Low Load"}
                </span>
              </div>
            </div>

            {/* ── Doctor Info + Timeline ── */}
            <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-sm font-bold flex items-center justify-center shadow-md shadow-cyan-200/50">
                    {getInitials(dashboard.doctor.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-cyan-800 text-base">{dashboard.doctor.name}</div>
                    <div className="text-xs text-cyan-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>🕐 {formatTime12(dashboard.doctor.consultStartTime)} – {formatTime12(dashboard.doctor.consultEndTime)}</span>
                      <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                      <span>{dashboard.doctor.slotDuration} min slots</span>
                      <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                      <span>{totalSlots} slots/day</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-cyan-500">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /> Available</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-rose-400" /> Booked</div>
                  {isToday && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-300" /> Expired</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {dashboard.slots.map((slot) => {
                  const isExpired = slot.status === "EXPIRED";
                  const isOcc = ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(slot.status);
                  return (
                    <div key={slot.slotStartTime}
                      title={`${formatTime12(slot.slotStartTime)} – ${formatTime12(slot.slotEndTime)}${slot.patient ? ` · ${slot.patient.name}` : isExpired ? " · Expired" : " · Available"}`}
                      className={`h-5 flex-1 min-w-[14px] max-w-[36px] rounded-sm cursor-default transition-opacity hover:opacity-70 ${isOcc ? "bg-rose-400" : isExpired ? "bg-gray-300" : "bg-emerald-400"
                        }`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-cyan-400">
                <span>{expiredCount > 0 ? `${expiredCount} expired` : ""}</span>
                <span>{bookedCount} booked · {availableCount} available</span>
              </div>
            </div>

            {/* ── Today indicator ── */}
            {isToday && (
              <div className="flex items-center gap-2 text-xs text-cyan-600 bg-cyan-50/80 border border-cyan-200 px-4 py-2.5 rounded-xl">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="font-medium">Showing only future bookable slots</span>
                <span className="text-cyan-400">— click any available slot to book instantly</span>
              </div>
            )}

            {/* ── Slot Groups ── */}
            {futureSlots.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🚫</span></div>
                <p className="text-amber-700 font-semibold">No bookable slots remaining</p>
                <p className="text-amber-500 text-sm mt-1">All slots have been booked or expired. Try tomorrow.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {groupedSlots.map((group) => {
                  const groupAvail = group.slots.filter((s) => s.status === "AVAILABLE").length;
                  const groupBooked = group.slots.filter((s) => ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(s.status)).length;

                  return (
                    <div key={group.label} className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/20">
                      <div className="px-5 py-3 bg-gradient-to-r from-cyan-50/80 to-teal-50/50 border-b border-cyan-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{group.icon}</span>
                          <div>
                            <span className="font-semibold text-cyan-800 text-sm">{group.label}</span>
                            <span className="text-[11px] text-cyan-400 ml-2">{group.range}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {groupAvail > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{groupAvail} free</span>}
                          {groupBooked > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-semibold">{groupBooked} booked</span>}
                        </div>
                      </div>

                      <div className="p-4 grid grid-cols-2 gap-2">
                        {group.slots.map((slot) => {
                          const isAvail = slot.status === "AVAILABLE";
                          const isOcc = ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(slot.status);

                          return (
                            <div
                              key={slot.slotStartTime}
                              onClick={() => isAvail && openBookingModal(slot)}
                              className={`rounded-xl p-3 transition-all border group ${isOcc
                                ? "bg-rose-50/60 border-rose-200/60 cursor-default"
                                : "bg-white/80 border-emerald-200 hover:border-cyan-400 hover:bg-cyan-50 hover:shadow-md hover:shadow-cyan-100/40 hover:-translate-y-0.5 cursor-pointer"
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className={`text-sm font-bold ${isOcc ? "text-rose-500" : "text-cyan-800"}`}>
                                  {formatTime12(slot.slotStartTime)}
                                </div>
                                {isAvail ? (
                                  <span className="w-6 h-6 rounded-lg bg-emerald-100 group-hover:bg-gradient-to-br group-hover:from-cyan-400 group-hover:to-teal-400 flex items-center justify-center transition-all">
                                    <svg className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-500 rounded-full">Booked</span>
                                )}
                              </div>
                              <div className="text-[11px] text-cyan-400">{formatTime12(slot.slotEndTime)}</div>
                              {slot.patient && (
                                <div className="mt-2 flex items-center gap-2 pt-2 border-t border-rose-100/50">
                                  <div className="w-6 h-6 rounded-full bg-rose-200 text-rose-700 text-[9px] font-bold flex items-center justify-center">
                                    {getInitials(slot.patient.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-rose-600 font-medium truncate">{slot.patient.name}</div>
                                  </div>
                                </div>
                              )}
                              {isAvail && (
                                <div className="mt-1.5 text-[10px] text-emerald-500 group-hover:text-cyan-600 font-medium transition-colors">
                                  Click to book →
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════ BOOKING MODAL (full-page blur) ═══════ */}
      {bookingSlot && dashboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-cyan-900/20 animate-modal-content">

            {confirmedAppointment ? (
              <>
                {/* ── Inline Success State ── */}
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50 animate-check-pop">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Appointment Confirmed!</h2>
                  <p className="text-cyan-500 text-sm mt-1">Booking #{confirmedAppointment.id} created successfully</p>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 mb-5 space-y-3 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">{confirmedAppointment.patient.name.charAt(0)}</span>
                    <div>
                      <p className="text-xs text-emerald-500 font-medium">Patient</p>
                      <p className="text-sm font-bold text-emerald-900">{confirmedAppointment.patient.name}</p>
                    </div>
                  </div>
                  <div className="h-px bg-emerald-200/50" />
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">{getInitials(confirmedAppointment.doctor.name)}</span>
                    <div>
                      <p className="text-xs text-emerald-500 font-medium">Doctor</p>
                      <p className="text-sm font-bold text-emerald-900">{confirmedAppointment.doctor.name}</p>
                    </div>
                  </div>
                  <div className="h-px bg-emerald-200/50" />
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-400 text-white text-xs flex items-center justify-center shadow-sm">📅</span>
                    <div>
                      <p className="text-xs text-emerald-500 font-medium">Date & Time</p>
                      <p className="text-sm font-bold text-emerald-900">
                        {new Date(confirmedAppointment.appointmentDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {formatTime12(confirmedAppointment.slotStartTime)} – {formatTime12(confirmedAppointment.slotEndTime)}
                      </p>
                    </div>
                  </div>
                  {confirmedAppointment.remoteSystem && (
                    <>
                      <div className="h-px bg-emerald-200/50" />
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-400 text-white text-xs flex items-center justify-center shadow-sm">🖥️</span>
                        <div>
                          <p className="text-xs text-emerald-500 font-medium">Remote System</p>
                          <p className="text-sm font-bold text-emerald-900">{confirmedAppointment.remoteSystem.name}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={closeAndRefresh}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
                >
                  ← Back to Dashboard
                </button>
              </>
            ) : bookingStep === "select" ? (
              <>
                {/* Step 1: Select Patient */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-200/50">📋</span>
                  <div>
                    <h2 className="text-xl font-bold text-cyan-900">Book Appointment</h2>
                    <p className="text-cyan-600/70 text-sm">Select a patient for this slot</p>
                  </div>
                </div>

                {/* Slot info */}
                <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {getInitials(dashboard.doctor.name)}
                    </div>
                    <div>
                      <p className="text-xs text-cyan-500 font-medium">Doctor</p>
                      <p className="text-sm font-bold text-cyan-900">{dashboard.doctor.name}</p>
                    </div>
                  </div>
                  <div className="h-px bg-cyan-200/50 my-3" />
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-400 text-white text-xs flex items-center justify-center shadow-sm">🕐</span>
                    <div>
                      <p className="text-xs text-cyan-500 font-medium">Time Slot</p>
                      <p className="text-sm font-bold text-cyan-900">
                        {formattedDate} · {formatTime12(bookingSlot.slotStartTime)} – {formatTime12(bookingSlot.slotEndTime)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient selector */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-cyan-800 mb-2">Select Patient</label>
                  <SearchableSelect
                    options={patients.map(p => ({
                      value: p.id,
                      label: p.name,
                      subLabel: `Age: ${p.age} • ${p.phone}`,
                      icon: <span className="text-xl">👤</span>
                    }))}
                    value={bookingPatient}
                    onChange={(val) => setBookingPatient(String(val))}
                    placeholder="Search for a patient..."
                  />
                  {selectedPatientObj && (
                    <div className="mt-3 flex items-center gap-3 p-3 bg-teal-50/60 border border-teal-100 rounded-xl animate-scale-in">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {selectedPatientObj.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-teal-800">{selectedPatientObj.name}</p>
                        <p className="text-xs text-teal-500">Age: {selectedPatientObj.age} • {selectedPatientObj.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={proceedToConfirm}
                    disabled={!bookingPatient}
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-cyan-200/50 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                  <button onClick={closeBookingModal} className="flex-1 py-2.5 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Confirm */}
                <div className="flex items-center gap-3 mb-5">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg animate-float ${systemFullError
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200/50"
                    : "bg-gradient-to-br from-cyan-400 to-teal-500 shadow-cyan-200/50"
                    }`}>
                    {systemFullError ? "⚠️" : "✓"}
                  </span>
                  <div>
                    <h2 className={`text-xl font-bold ${systemFullError ? "text-amber-900" : "text-cyan-900"}`}>
                      {systemFullError ? "Systems Occupied" : "Confirm Booking"}
                    </h2>
                    <p className={`${systemFullError ? "text-amber-700/80" : "text-cyan-600/70"} text-sm`}>
                      {systemFullError ? "Please review availability" : "Please review the details below"}
                    </p>
                  </div>
                </div>

                {systemFullError && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-5 text-amber-800 text-sm animate-fade-in-down">
                    <p className="font-semibold mb-2">{systemFullError.message}</p>
                    {systemFullError.nextSlot ? (
                      <p>
                        However, <span className="font-bold underline">there is a remote system available at {formatTime12(systemFullError.nextSlot)}</span>. Would you like to book that slot instead?
                      </p>
                    ) : (
                      <p>
                        There are no more slots with a free remote system available today for this doctor.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-4 mb-5 space-y-3 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {selectedPatientObj?.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-xs text-cyan-500 font-medium">Patient</p>
                      <p className="text-sm font-bold text-cyan-900">{selectedPatientObj?.name}</p>
                    </div>
                  </div>
                  <div className="h-px bg-cyan-200/50" />
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {getInitials(dashboard.doctor.name)}
                    </span>
                    <div>
                      <p className="text-xs text-cyan-500 font-medium">Doctor</p>
                      <p className="text-sm font-bold text-cyan-900">{dashboard.doctor.name}</p>
                    </div>
                  </div>
                  <div className="h-px bg-cyan-200/50" />
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-400 text-white text-xs flex items-center justify-center shadow-sm">📅</span>
                    <div>
                      <p className="text-xs text-cyan-500 font-medium">Date & Time</p>
                      <p className="text-sm font-bold text-cyan-900">
                        {formattedDate} · {formatTime12(bookingSlot.slotStartTime)} – {formatTime12(bookingSlot.slotEndTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {systemFullError ? (
                    <>
                      {systemFullError.nextSlot && (
                        <button
                          onClick={() => {
                            const newSlotObj = dashboard.slots.find(s => s.slotStartTime === systemFullError.nextSlot);
                            if (newSlotObj) {
                              setBookingSlot(newSlotObj);
                              setSystemFullError(null);
                            }
                          }}
                          className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md shadow-amber-200/50 hover:shadow-lg transition-all"
                        >
                          Select {formatTime12(systemFullError.nextSlot)}
                        </button>
                      )}
                      <button
                        onClick={closeBookingModal}
                        className="flex-1 py-2.5 border-2 border-amber-200 text-amber-800 font-medium rounded-xl hover:bg-amber-50 transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={confirmBooking}
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-cyan-200/50 hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Booking...
                          </span>
                        ) : "Confirm & Book"}
                      </button>
                      <button
                        onClick={() => setBookingStep("select")}
                        className="flex-1 py-2.5 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all"
                      >
                        Go Back
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════ REMOTE SYSTEM SCHEDULE POPUP ═══════ */}
      {selectedSystem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedSystem(null); }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl shadow-cyan-900/20 animate-modal-content overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-cyan-100/50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-lg flex items-center justify-center shadow-md shadow-indigo-200/50">
                  🖥️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-cyan-900">{selectedSystem.name}</h2>
                  {selectedSystem.location && (
                    <p className="text-xs text-cyan-400 flex items-center gap-1 mt-0.5">📍 {selectedSystem.location}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedSystem(null)}
                className="w-8 h-8 rounded-lg bg-cyan-50 hover:bg-cyan-100 flex items-center justify-center text-cyan-500 hover:text-cyan-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Schedule Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Today */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-cyan-800">Today</span>
                  <span className="text-xs text-cyan-400">
                    {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
                {selectedSystem.todayAppointments.length === 0 ? (
                  <div className="bg-cyan-50/40 border border-cyan-100 rounded-xl px-4 py-6 text-center">
                    <p className="text-cyan-400 text-sm">No appointments scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSystem.todayAppointments.map((appt) => {
                      const now = new Date();
                      const nowMin = now.getHours() * 60 + now.getMinutes();
                      const [sh, sm] = appt.slotStartTime.split(":").map(Number);
                      const [eh, em] = appt.slotEndTime.split(":").map(Number);
                      const startMin = sh * 60 + sm;
                      const endMin = eh * 60 + em;
                      const isActive = nowMin >= startMin && nowMin < endMin;
                      const isPast = nowMin >= endMin;
                      return (
                        <div key={appt.id} className={`rounded-xl p-3 border transition-colors ${isActive ? "bg-emerald-50/80 border-emerald-200" : isPast ? "bg-gray-50/50 border-gray-100 opacity-60" : "bg-white/60 border-cyan-100"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center shadow-sm ${isActive ? "bg-gradient-to-br from-emerald-400 to-green-500" : isPast ? "bg-gray-300" : "bg-gradient-to-br from-cyan-400 to-teal-500"}`}>
                                {getInitials(appt.patientName)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-cyan-900">{appt.patientName}</span>
                                  <span className="text-cyan-300 text-[10px]">→</span>
                                  <span className="text-xs text-cyan-600">{appt.doctorName}</span>
                                </div>
                                <div className="text-[11px] text-cyan-400 mt-0.5">
                                  🕐 {formatTime12(appt.slotStartTime)} – {formatTime12(appt.slotEndTime)}
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-100 text-emerald-700" : isPast ? "bg-gray-200 text-gray-500" : "bg-cyan-100 text-cyan-700"}`}>
                              {isActive ? "IN SESSION" : isPast ? "DONE" : "UPCOMING"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tomorrow */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="text-sm font-semibold text-cyan-800">Tomorrow</span>
                  <span className="text-xs text-cyan-400">
                    {(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); })()}
                  </span>
                </div>
                {selectedSystem.tomorrowAppointments.length === 0 ? (
                  <div className="bg-cyan-50/40 border border-cyan-100 rounded-xl px-4 py-6 text-center">
                    <p className="text-cyan-400 text-sm">No appointments scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSystem.tomorrowAppointments.map((appt) => (
                      <div key={appt.id} className="rounded-xl p-3 border bg-white/60 border-cyan-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {getInitials(appt.patientName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-cyan-900">{appt.patientName}</span>
                                <span className="text-cyan-300 text-[10px]">→</span>
                                <span className="text-xs text-cyan-600">{appt.doctorName}</span>
                              </div>
                              <div className="text-[11px] text-cyan-400 mt-0.5">
                                🕐 {formatTime12(appt.slotStartTime)} – {formatTime12(appt.slotEndTime)}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">SCHEDULED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
