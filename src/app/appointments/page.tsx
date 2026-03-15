"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
  consultStartTime: string;
  consultEndTime: string;
  slotDuration: number;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

interface Slot {
  slotStartTime: string;
  slotEndTime: string;
  status: "BOOKED" | "AVAILABLE" | "EXPIRED" | "IN_PROGRESS" | "COMPLETED";
}

interface DoctorFullResponse {
  status: "doctor_full";
  message: string;
  tomorrow: string;
  targetDate: string;
  availableDoctors: Array<{
    id: number;
    name: string;
    totalSlots: number;
    availableSlots: number;
  }>;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function CreateAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center gap-3 text-cyan-500 py-16">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    }>
      <CreateAppointmentContent />
    </Suspense>
  );
}

function CreateAppointmentContent() {
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(
    searchParams.get("doctorId") || ""
  );
  const [selectedSlot, setSelectedSlot] = useState(
    searchParams.get("slot") || ""
  );
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(
    searchParams.get("date") || new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefillBanner, setPrefillBanner] = useState(
    !!searchParams.get("doctorId")
  );

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(false);

  // Doctor-full modal
  const [showFullModal, setShowFullModal] = useState(false);
  const [fullInfo, setFullInfo] = useState<DoctorFullResponse | null>(null);

  // Success details
  const [successDetails, setSuccessDetails] = useState<{
    patientName: string;
    doctorName: string;
    date: string;
    slot: string;
    system?: string;
  } | null>(null);

  const fetchPatients = useCallback(async () => {
    const res = await fetch("/api/patients");
    setPatients(await res.json());
  }, []);

  const fetchDoctors = useCallback(async () => {
    const res = await fetch(`/api/doctors?date=${appointmentDate}`);
    setDoctors(await res.json());
  }, [appointmentDate]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor) {
      setAllSlots([]);
      setSelectedSlot("");
      return;
    }

    setSlotsLoading(true);
    const res = await fetch(
      `/api/doctor/${selectedDoctor}/slots?date=${appointmentDate}`
    );
    const data = await res.json();
    setSlotsLoading(false);

    if (!res.ok) {
      setAllSlots([]);
      setSelectedSlot("");
      return;
    }

    // Keep ALL slots for grid display
    setAllSlots(data.slots);

    // Auto-select first available slot if current selection is invalid
    const available = data.slots.filter((s: Slot) => s.status === "AVAILABLE");
    setSelectedSlot((prev) =>
      available.some((s: Slot) => s.slotStartTime === prev)
        ? prev
        : ""
    );
  }, [appointmentDate, selectedDoctor]);

  useSocket(fetchDoctors);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);
  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Auto-dismiss alerts
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 8000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (warning) { const t = setTimeout(() => setWarning(null), 8000); return () => clearTimeout(t); } }, [warning]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 10000); return () => clearTimeout(t); } }, [error]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmModal(true);
  }

  async function confirmAndBook() {
    setConfirmModal(false);
    await bookAppointment(Number(selectedDoctor), appointmentDate, selectedSlot);
  }

  async function bookAppointment(
    doctorId: number,
    targetDate: string,
    slotStartTime: string
  ) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setWarning(null);
    setSuccessDetails(null);

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: Number(selectedPatient),
        doctorId,
        appointmentDate: targetDate,
        slotStartTime,
      }),
    });

    setSubmitting(false);
    const data = await res.json();

    if (res.status === 409 && data.status === "doctor_full") {
      setFullInfo(data);
      setShowFullModal(true);
      return;
    }

    if (res.status === 409 && data.status === "systems_full") {
      setError(data.error || "All remote consultation systems are occupied at this time slot.");
      return;
    }

    if (data.status === "slot_expired") {
      setError(data.error || "This time slot has expired. Please select a later time.");
      fetchSlots();
      return;
    }

    if (res.ok) {
      const appt = data.appointment;
      const systemName = data.assignedSystem
        ? `${data.assignedSystem.name}${data.assignedSystem.location ? ` (${data.assignedSystem.location})` : ""}`
        : undefined;

      setSuccessDetails({
        patientName: appt.patient.name,
        doctorName: appt.doctor.name,
        date: appt.appointmentDate,
        slot: `${formatTime12(appt.slotStartTime)} – ${formatTime12(appt.slotEndTime)}`,
        system: systemName,
      });

      setSuccess("Appointment booked successfully!");
      if (data.warning) setWarning(data.warning);

      setSelectedPatient("");
      setSelectedDoctor("");
      setSelectedSlot("");
      setAllSlots([]);
      setAppointmentDate(new Date().toISOString().split("T")[0]);
      fetchDoctors();
    } else {
      setError(data.error || "Failed to create appointment");
    }
  }

  async function handleScheduleTomorrow() {
    if (!fullInfo) return;
    setShowFullModal(false);
    setAppointmentDate(fullInfo.tomorrow);
  }

  async function handlePickAlternative(altDoctorId: number) {
    setShowFullModal(false);
    setSelectedDoctor(String(altDoctorId));
    setAppointmentDate(fullInfo?.targetDate || appointmentDate);
  }

  const selectedDoctorObj = doctors.find((d) => d.id === Number(selectedDoctor));
  const selectedPatientObj = patients.find((p) => p.id === Number(selectedPatient));
  const selectedSlotObj = allSlots.find((s) => s.slotStartTime === selectedSlot);

  const isToday = appointmentDate === new Date().toISOString().split("T")[0];
  const availableCount = allSlots.filter((s) => s.status === "AVAILABLE").length;
  const bookedCount = allSlots.filter((s) => ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(s.status)).length;
  const expiredCount = allSlots.filter((s) => s.status === "EXPIRED").length;

  const dateLabel = appointmentDate
    ? new Date(appointmentDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const canSubmit = !submitting && !!selectedPatient && !!selectedDoctor && !!selectedSlot;

  return (
    <>
      <div className="animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-200/50 animate-float">
              📋
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
                Create Appointment
              </h1>
              <p className="text-cyan-600/70 mt-0.5">
                Schedule a patient consultation with available doctors
              </p>
            </div>
          </div>
          {isToday && (
            <div className="flex items-center gap-2 text-xs text-cyan-600 bg-cyan-50 border border-cyan-200 px-3 py-2 rounded-xl">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Scheduling for today — only future time slots are available
            </div>
          )}
        </div>

        {/* Prefill banner */}
        {prefillBanner && (
          <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center justify-between gap-3 animate-fade-in-down">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">ℹ</div>
              <div>
                <p className="text-sm font-semibold text-cyan-800">Pre-filled from Dashboard</p>
                <p className="text-xs text-cyan-500 mt-0.5">Doctor and slot are pre-selected — just pick a patient and confirm.</p>
              </div>
            </div>
            <button type="button" onClick={() => setPrefillBanner(false)} className="text-cyan-400 hover:text-cyan-600 transition-colors">✕</button>
          </div>
        )}

        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-fade-in-down">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-full flex items-center justify-center text-lg shadow-md shadow-emerald-200 animate-check-pop">✓</span>
              <span className="text-base font-bold text-emerald-800 flex-1">{success}</span>
              <button onClick={() => { setSuccess(null); setSuccessDetails(null); }} className="text-emerald-400 hover:text-emerald-600 transition-colors">✕</button>
            </div>
            {successDetails && (
              <div className="ml-12 space-y-1">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span className="text-emerald-400">👤</span><span className="font-medium">{successDetails.patientName}</span>
                  <span className="text-emerald-400">→</span><span className="font-medium">{successDetails.doctorName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span className="text-emerald-400">📅</span><span>{successDetails.date}</span>
                  <span className="text-emerald-400">🕐</span><span>{successDetails.slot}</span>
                </div>
                {successDetails.system && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <span className="text-emerald-400">🖥️</span><span>Assigned to <strong>{successDetails.system}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {warning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center gap-3 animate-fade-in-down">
            <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-full flex items-center justify-center text-sm shadow-md shadow-amber-200">⚠</span>
            <span className="text-sm font-medium flex-1">{warning}</span>
            <button onClick={() => setWarning(null)} className="text-amber-400 hover:text-amber-600 transition-colors">✕</button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-3 animate-fade-in-down">
            <span className="w-7 h-7 bg-gradient-to-br from-rose-400 to-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-md shadow-rose-200">✕</span>
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 transition-colors">✕</button>
          </div>
        )}

        {/* ────────── Main Content: Two-Column Layout ────────── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column: Booking Form ── */}
            <div className="lg:col-span-1 space-y-5">

              {/* Date */}
              <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 relative z-30">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">1</span>
                  <label htmlFor="appointmentDate" className="text-sm font-semibold text-cyan-800">Appointment Date</label>
                </div>
                <div className="relative mt-2">
                  <DatePicker
                    value={appointmentDate}
                    onChange={setAppointmentDate}
                    minDate={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <p className="text-[11px] text-cyan-400 mt-2">{dateLabel}</p>
              </div>

              {/* Patient */}
              <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 relative z-20">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">2</span>
                  <label htmlFor="patient" className="text-sm font-semibold text-cyan-800">Select Patient</label>
                </div>
                <div className="relative mt-2">
                  <SearchableSelect
                    options={patients.map(p => ({
                      value: p.id,
                      label: p.name,
                      subLabel: `Age: ${p.age} • ${p.phone}`,
                      icon: <span className="text-xl">👤</span>
                    }))}
                    value={selectedPatient}
                    onChange={(val) => setSelectedPatient(String(val))}
                    placeholder="Search for a patient..."
                  />
                </div>
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

              {/* Doctor */}
              <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">3</span>
                  <label htmlFor="doctor" className="text-sm font-semibold text-cyan-800">Select Doctor</label>
                </div>
                <div className="relative mt-2">
                  <SearchableSelect
                    options={doctors.map(d => ({
                      value: d.id,
                      label: `${d.name} ${d.availableSlots <= 0 ? "(FULL)" : ""}`,
                      subLabel: `${d.availableSlots}/${d.totalSlots} slots available`,
                      icon: <span className="text-xl">🩺</span>
                    }))}
                    value={selectedDoctor}
                    onChange={(val) => setSelectedDoctor(String(val))}
                    placeholder="Search for a doctor..."
                    disabled={doctors.length === 0}
                  />
                </div>
                {selectedDoctorObj && (
                  <div className="mt-3 p-3 bg-cyan-50/60 border border-cyan-100 rounded-xl animate-scale-in">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {selectedDoctorObj.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-cyan-800">{selectedDoctorObj.name}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                          selectedDoctorObj.availableSlots <= 0 ? "bg-rose-100 text-rose-700"
                          : selectedDoctorObj.availableSlots <= 2 ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedDoctorObj.availableSlots <= 0 ? "bg-rose-500" : selectedDoctorObj.availableSlots <= 2 ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                          {selectedDoctorObj.availableSlots} of {selectedDoctorObj.totalSlots} available
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-cyan-100/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full animate-progress ${
                          selectedDoctorObj.availableSlots >= Math.ceil(selectedDoctorObj.totalSlots * 0.5)
                            ? "bg-gradient-to-r from-teal-400 to-emerald-400"
                            : selectedDoctorObj.availableSlots > 0 ? "bg-gradient-to-r from-amber-400 to-yellow-400" : "bg-rose-400"
                        }`}
                        style={{ width: `${Math.max((selectedDoctorObj.availableSlots / Math.max(selectedDoctorObj.totalSlots, 1)) * 100, 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit + Summary */}
              <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30">
                <h3 className="text-sm font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">✓</span>
                  Booking Summary
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cyan-500">Patient</span>
                    <span className="font-medium text-cyan-800">{selectedPatientObj?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cyan-500">Doctor</span>
                    <span className="font-medium text-cyan-800">{selectedDoctorObj?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cyan-500">Date</span>
                    <span className="font-medium text-cyan-800">{dateLabel || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cyan-500">Time Slot</span>
                    <span className="font-medium text-cyan-800">
                      {selectedSlotObj ? `${formatTime12(selectedSlotObj.slotStartTime)} – ${formatTime12(selectedSlotObj.slotEndTime)}` : "—"}
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`w-full py-3 btn-primary font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-cyan-200/50 ${
                    canSubmit ? "animate-pulse-glow" : ""
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Booking...
                    </span>
                  ) : "Book Appointment"}
                </button>
              </div>
            </div>

            {/* ── Right Column: Time Slot Grid ── */}
            <div className="lg:col-span-2">
              <div className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">4</span>
                    <h2 className="text-sm font-semibold text-cyan-800">Select Time Slot</h2>
                  </div>
                  {selectedDoctor && allSlots.length > 0 && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border-2 border-emerald-400" /> Available ({availableCount})</span>
                      <span className="flex items-center gap-1 text-cyan-500"><span className="w-2.5 h-2.5 rounded bg-cyan-100 border-2 border-cyan-300" /> Booked ({bookedCount})</span>
                      {expiredCount > 0 && <span className="flex items-center gap-1 text-gray-400"><span className="w-2.5 h-2.5 rounded bg-gray-100 border-2 border-gray-300" /> Expired ({expiredCount})</span>}
                    </div>
                  )}
                </div>

                {!selectedDoctor ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mb-4">
                      <span className="text-3xl">🕐</span>
                    </div>
                    <p className="text-cyan-600 font-medium">Select a doctor to view time slots</p>
                    <p className="text-cyan-400 text-sm mt-1">Available slots will appear here as a grid</p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-cyan-500 text-sm font-medium">Loading time slots...</span>
                  </div>
                ) : allSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                      <span className="text-3xl">📭</span>
                    </div>
                    <p className="text-amber-700 font-medium">No slots available</p>
                    <p className="text-amber-500 text-sm mt-1">This doctor has no configured slots. Try another doctor or date.</p>
                  </div>
                ) : availableCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
                      <span className="text-3xl">🚫</span>
                    </div>
                    <p className="text-rose-700 font-medium">All slots are taken{isToday ? " or expired" : ""}</p>
                    <p className="text-rose-500 text-sm mt-1">Try a different {isToday ? "date or " : ""}doctor</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {allSlots.map((slot) => {
                      const isAvailable = slot.status === "AVAILABLE";
                      const isSelected = selectedSlot === slot.slotStartTime;
                      const isExpired = slot.status === "EXPIRED";
                      const isBooked = slot.status === "BOOKED" || slot.status === "IN_PROGRESS" || slot.status === "COMPLETED";

                      let cardClass = "";
                      let labelColor = "";
                      let statusLabel = "";

                      if (isSelected) {
                        cardClass = "bg-gradient-to-br from-cyan-500 to-teal-500 text-white border-2 border-cyan-400 shadow-lg shadow-cyan-200/50 scale-[1.03]";
                        labelColor = "text-white/80";
                      } else if (isAvailable) {
                        cardClass = "bg-white/90 border-2 border-emerald-200 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-100/40 hover:scale-[1.02] cursor-pointer";
                        labelColor = "text-emerald-500";
                        statusLabel = "Available";
                      } else if (isBooked) {
                        cardClass = "bg-cyan-50/50 border-2 border-cyan-200/60 opacity-60 cursor-not-allowed";
                        labelColor = "text-cyan-400";
                        statusLabel = "Booked";
                      } else if (isExpired) {
                        cardClass = "bg-gray-50/50 border-2 border-gray-200/60 opacity-40 cursor-not-allowed";
                        labelColor = "text-gray-400";
                        statusLabel = "Expired";
                      }

                      return (
                        <button
                          key={slot.slotStartTime}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedSlot(slot.slotStartTime)}
                          className={`relative rounded-xl p-3 text-center transition-all duration-200 ${cardClass}`}
                        >
                          <div className={`text-sm font-bold ${isSelected ? "text-white" : "text-cyan-800"}`}>
                            {formatTime12(slot.slotStartTime)}
                          </div>
                          <div className={`text-[11px] ${isSelected ? "text-white/70" : "text-cyan-400"}`}>
                            {formatTime12(slot.slotEndTime)}
                          </div>
                          {isSelected ? (
                            <div className="mt-1.5 text-[10px] font-bold text-white/90 flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              SELECTED
                            </div>
                          ) : statusLabel ? (
                            <div className={`mt-1.5 text-[10px] font-semibold ${labelColor}`}>
                              {isBooked && "🔒 "}{isExpired && "⏰ "}{statusLabel}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Booking Confirmation Modal — FULL PAGE BLUR ── */}
      {confirmModal && selectedPatientObj && selectedDoctorObj && selectedSlotObj && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-cyan-900/20 animate-modal-content">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-cyan-200/50 animate-float">📋</span>
              <div>
                <h2 className="text-xl font-bold text-cyan-900">Confirm Booking</h2>
                <p className="text-cyan-600/70 text-sm">Please review the appointment details</p>
              </div>
            </div>

            <div className="bg-cyan-50/60 border border-cyan-200 rounded-xl p-4 mb-5 space-y-3 animate-fade-in-up">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {selectedPatientObj.name.charAt(0)}
                </span>
                <div>
                  <p className="text-xs text-cyan-500 font-medium">Patient</p>
                  <p className="text-sm font-bold text-cyan-900">{selectedPatientObj.name}</p>
                </div>
              </div>
              <div className="h-px bg-cyan-200/50" />
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {selectedDoctorObj.name.charAt(0)}
                </span>
                <div>
                  <p className="text-xs text-cyan-500 font-medium">Doctor</p>
                  <p className="text-sm font-bold text-cyan-900">{selectedDoctorObj.name}</p>
                </div>
              </div>
              <div className="h-px bg-cyan-200/50" />
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-400 text-white text-xs flex items-center justify-center shadow-sm">📅</span>
                <div>
                  <p className="text-xs text-cyan-500 font-medium">Date & Time</p>
                  <p className="text-sm font-bold text-cyan-900">
                    {dateLabel} · {formatTime12(selectedSlotObj.slotStartTime)} – {formatTime12(selectedSlotObj.slotEndTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmAndBook}
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
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Doctor Full Modal — FULL PAGE BLUR ── */}
      {showFullModal && fullInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-cyan-900/20 animate-modal-content">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-xl shadow-lg shadow-amber-200/50 animate-float">⚠️</span>
              <div>
                <h2 className="text-xl font-bold text-cyan-900">Doctor Unavailable</h2>
                <p className="text-cyan-600/70 text-sm">{fullInfo.message}</p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-5 animate-fade-in-up">
              <p className="text-amber-800 font-medium text-sm">All slots for {fullInfo.targetDate} are taken.</p>
            </div>

            <div className="flex gap-3 mb-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <button onClick={handleScheduleTomorrow} className="flex-1 py-2.5 btn-primary font-medium rounded-xl shadow-md shadow-cyan-200/50">Go to {fullInfo.tomorrow}</button>
              <button onClick={() => setShowFullModal(false)} className="flex-1 py-2.5 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all">Cancel</button>
            </div>

            {fullInfo.availableDoctors.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                <h3 className="text-sm font-semibold text-cyan-700 mb-3">Or choose another doctor for {fullInfo.targetDate}:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fullInfo.availableDoctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handlePickAlternative(doc.id)}
                      className="w-full flex items-center gap-3 p-3 border-2 border-cyan-100 rounded-xl hover:border-cyan-300 hover:bg-cyan-50 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {doc.name.charAt(0)}
                      </div>
                      <span className="font-medium text-cyan-900 flex-1">{doc.name}</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">{doc.availableSlots} slots</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
