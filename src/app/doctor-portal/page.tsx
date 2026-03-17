"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";
import { useSearchParams } from "next/navigation";

interface RemoteSystem {
  id: number;
  name: string;
  location: string;
}

interface PortalAppointment {
  id: number;
  patientId: number;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  slotStartTime: string;
  slotEndTime: string;
  status: "BOOKED" | "IN_PROGRESS" | "COMPLETED";
  remoteSystem: RemoteSystem | null;
}

interface DoctorInfo {
  id: number;
  name: string;
  consultStartTime: string;
  consultEndTime: string;
  slotDuration: number;
}

interface DoctorOption {
  id: number;
  name: string;
}

interface PortalData {
  doctor: DoctorInfo;
  date: string;
  today: string;
  totalSlots: number;
  appointments: PortalAppointment[];
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getSlotState(
  start: string,
  end: string,
  status: string,
  isToday: boolean
): "past" | "active" | "upcoming" | "completed" | "in_progress" {
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "in_progress";
  if (!isToday) return "upcoming";

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

function isBeforeSlotEnd(endTime: string): boolean {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [eh, em] = endTime.split(":").map(Number);
  return nowMinutes < eh * 60 + em;
}

export default function DoctorPortalPage() {
  const searchParams = useSearchParams();
  const doctorIdFromQuery = searchParams.get("doctorId");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);

  // Complete session modal state
  const [completeModal, setCompleteModal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<PortalAppointment | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completionResult, setCompletionResult] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Load doctors list
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        setDoctors(data.map((d: DoctorOption) => ({ id: d.id, name: d.name })));
      });
  }, []);

  useEffect(() => {
    if (!doctorIdFromQuery || selectedDoctor) {
      return;
    }

    setSelectedDoctor(doctorIdFromQuery);
  }, [doctorIdFromQuery, selectedDoctor]);

  const fetchPortal = useCallback(async () => {
    if (!selectedDoctor) return;
    setLoading(true);
    const res = await fetch(
      `/api/doctor-portal?doctorId=${selectedDoctor}&date=${selectedDate}`
    );
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [selectedDoctor, selectedDate]);

  useSocket(fetchPortal);

  useEffect(() => {
    fetchPortal();
  }, [fetchPortal]);

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const isPast = selectedDate < new Date().toISOString().split("T")[0];

  function navigateDate(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  function handleCompleteClick(appt: PortalAppointment) {
    const isEarly = isToday && isBeforeSlotEnd(appt.slotEndTime);
    if (isEarly) {
      // Show confirmation modal
      setCompleteTarget(appt);
      setCompleteModal(true);
    } else {
      // Direct completion
      doComplete(appt.id, false);
    }
  }

  async function doComplete(appointmentId: number, earlyFinish: boolean) {
    setCompleting(true);
    setCompletionError(null);
    setCompletionResult(null);
    setCompleteModal(false);

    const res = await fetch(`/api/appointments/${appointmentId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ earlyFinish }),
    });

    setCompleting(false);
    const result = await res.json();

    if (res.ok) {
      const msg = earlyFinish && result.nextAppointment
        ? `Session completed early! Next patient (${result.nextAppointment.patient.name}) is now ready.`
        : "Session completed successfully.";
      setCompletionResult(msg);
      fetchPortal();
    } else {
      setCompletionError(result.error || "Failed to complete session");
    }
  }

  const dateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const bookedCount = data?.appointments.filter((a) => a.status === "BOOKED").length ?? 0;
  const completedCount = data?.appointments.filter((a) => a.status === "COMPLETED").length ?? 0;
  const inProgressCount = data?.appointments.filter((a) => a.status === "IN_PROGRESS").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <a href="/home" className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-800 font-medium transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </a>

      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse" />
          <span className="text-xs text-teal-600 font-semibold uppercase tracking-wider">
            Doctor Portal
          </span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
          My Appointments
        </h1>
        <p className="text-sm text-cyan-500 mt-1">
          View and manage your consultation sessions
        </p>
      </div>

      {/* Alerts */}
      {completionResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-3 animate-fade-in-down">
          <span className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm shadow-md shadow-emerald-200">✓</span>
          <span className="text-sm font-medium flex-1">{completionResult}</span>
          <button onClick={() => setCompletionResult(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}
      {completionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-3 animate-fade-in-down">
          <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm">✕</span>
          <span className="text-sm font-medium flex-1">{completionError}</span>
          <button onClick={() => setCompletionError(null)} className="text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Controls: Doctor + Date */}
      <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 animate-fade-in-up relative z-20">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Doctor Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-cyan-600 mb-1.5 block">
              Select Doctor
            </label>
            <div className="relative mt-2">
              <SearchableSelect
                options={[
                  { value: "", label: "Choose a doctor..." },
                  ...doctors.map(d => ({ value: d.id, label: d.name }))
                ]}
                value={selectedDoctor}
                onChange={(val) => setSelectedDoctor(String(val))}
                placeholder="Choose a doctor..."
              />
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDate(-1)}
              className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors border border-cyan-200"
              title="Previous day"
            >
              ←
            </button>
            <div className="relative w-40 sm:w-48">
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition-colors border border-cyan-200"
              title="Next day"
            >
              →
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-2.5 text-xs font-semibold text-cyan-600 border-2 border-cyan-200 rounded-xl hover:bg-cyan-50 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Date & Stats Banner */}
      {data && (
        <div className="flex flex-wrap items-center gap-3 animate-fade-in-up">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-cyan-900">{dateLabel}</h2>
            <p className="text-xs text-cyan-400 mt-0.5">
              {data.doctor.name} · {formatTime12(data.doctor.consultStartTime)} – {formatTime12(data.doctor.consultEndTime)}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isToday ? "bg-emerald-100 text-emerald-700" : isPast ? "bg-gray-200 text-gray-500" : "bg-cyan-100 text-cyan-700"
            }`}>
            {isToday ? "TODAY" : isPast ? "PAST" : "UPCOMING"}
          </span>
          <div className="flex gap-2">
            {inProgressCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                {inProgressCount} in session
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
              {bookedCount} scheduled
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              {completedCount} done
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {!selectedDoctor ? (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🩺</span>
          </div>
          <p className="text-cyan-600 font-medium">Select a doctor to view appointments</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-3 text-cyan-500 py-16">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading appointments…</span>
        </div>
      ) : data && data.appointments.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-cyan-600 font-medium">No appointments for this day</p>
          <p className="text-cyan-400 text-sm mt-1">This doctor has no consultations scheduled on {dateLabel}</p>
        </div>
      ) : data ? (
        <div className="space-y-3 stagger animate-fade-in-up">
          {data.appointments.map((appt, idx) => {
            const state = getSlotState(appt.slotStartTime, appt.slotEndTime, appt.status, isToday);

            const cardStyles: Record<string, string> = {
              active: "border-l-4 border-l-emerald-400 bg-emerald-50/50",
              in_progress: "border-l-4 border-l-blue-400 bg-blue-50/50",
              completed: "border-l-4 border-l-gray-300 bg-gray-50/30 opacity-65",
              past: "border-l-4 border-l-amber-300 bg-amber-50/30 opacity-70",
              upcoming: "border-l-4 border-l-cyan-300",
            };

            const badgeStyles: Record<string, { bg: string; text: string; label: string }> = {
              active: { bg: "bg-emerald-100", text: "text-emerald-700", label: "IN SESSION" },
              in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "READY — START NOW" },
              completed: { bg: "bg-gray-200", text: "text-gray-500", label: "COMPLETED" },
              past: { bg: "bg-amber-100", text: "text-amber-600", label: "MISSED" },
              upcoming: { bg: "bg-cyan-100", text: "text-cyan-700", label: "UPCOMING" },
            };

            const badge = badgeStyles[state];
            const canComplete = (state === "active" || state === "in_progress") && appt.status !== "COMPLETED";

            return (
              <div
                key={appt.id}
                className={`glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30 card-hover ${cardStyles[state]}`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="text-center min-w-[80px]">
                        <div className="text-sm font-bold text-cyan-800">
                          {formatTime12(appt.slotStartTime)}
                        </div>
                        <div className="text-[11px] text-cyan-400">
                          {formatTime12(appt.slotEndTime)}
                        </div>
                      </div>
                      {/* Divider */}
                      <div className="w-px h-10 bg-cyan-200/50" />
                      {/* Patient Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${state === "completed" || state === "past"
                              ? "bg-gray-300"
                              : "bg-gradient-to-br from-teal-400 to-cyan-500"
                            }`}>
                            {appt.patientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-cyan-900 text-sm">
                              {appt.patientName}
                            </div>
                            <div className="text-xs text-cyan-400">
                              Age: {appt.patientAge} · {appt.patientPhone}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Remote System Badge */}
                      {appt.remoteSystem && (
                        <span className="text-[10px] font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-600 rounded-full hidden sm:inline-flex items-center gap-1">
                          🖥️ {appt.remoteSystem.name}
                        </span>
                      )}
                      {/* Status Badge */}
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${badge.bg} ${badge.text}`}>
                        {(state === "active" || state === "in_progress") && (
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${state === "in_progress" ? "bg-blue-500" : "bg-emerald-500"
                            }`} />
                        )}
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Remote system info for mobile */}
                  {appt.remoteSystem && (
                    <div className="sm:hidden text-[10px] text-indigo-500 mb-2 flex items-center gap-1">
                      🖥️ {appt.remoteSystem.name} · {appt.remoteSystem.location}
                    </div>
                  )}

                  {/* Action: Complete Session */}
                  {canComplete && (
                    <div className="flex justify-end pt-2 border-t border-cyan-100/50 mt-2">
                      <button
                        onClick={() => handleCompleteClick(appt)}
                        disabled={completing}
                        className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 ${state === "in_progress"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200/50 hover:shadow-lg"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200/50 hover:shadow-lg"
                          }`}
                      >
                        {completing ? "Completing..." : "✓ Complete Session"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Early Completion Confirmation Modal */}
      {completeModal && completeTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-modal-overlay">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-cyan-200/30 !bg-white/95 animate-modal-content">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-xl shadow-lg shadow-amber-200/50 animate-float">
                ⚡
              </span>
              <div>
                <h2 className="text-xl font-bold text-cyan-900">Early Completion</h2>
                <p className="text-cyan-600/70 text-sm">Session finishing before scheduled end time</p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-4 animate-fade-in-up">
              <p className="text-amber-800 text-sm font-medium mb-1">
                The current session ({formatTime12(completeTarget.slotStartTime)} – {formatTime12(completeTarget.slotEndTime)}) with{" "}
                <strong>{completeTarget.patientName}</strong> hasn&apos;t reached its scheduled end time.
              </p>
              <p className="text-amber-600 text-xs mt-2">
                Confirming early completion will mark this session as done and automatically start the next patient&apos;s consultation (if available).
              </p>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 mb-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">→</span>
                <p className="text-blue-800 text-sm font-medium">
                  The next scheduled patient will be notified to join the consultation.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => doComplete(completeTarget.id, true)}
                disabled={completing}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {completing ? "Completing..." : "Yes, Complete Early"}
              </button>
              <button
                onClick={() => { setCompleteModal(false); setCompleteTarget(null); }}
                className="flex-1 py-2.5 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
