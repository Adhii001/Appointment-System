"use client";

import { useEffect, useState, use } from "react";

interface AppointmentDetails {
  id: number;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  status: string;
  patient: { id: number; name: string; phone: string; age: number };
  doctor: { id: number; name: string };
  remoteSystem: { id: number; name: string; location: string } | null;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AppointmentSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointment() {
      setLoading(true);
      const res = await fetch(`/api/appointments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);
      } else {
        setError("Appointment not found");
      }
      setLoading(false);
    }
    fetchAppointment();
  }, [id]);

  const formattedDate = appointment
    ? new Date(appointment.appointmentDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-cyan-600">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading appointment details…</span>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-2xl font-bold text-rose-700 mb-2">Appointment Not Found</h1>
        <p className="text-rose-500 text-sm mb-6">{error || "This appointment does not exist."}</p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-cyan-200/50 hover:shadow-lg transition-all">
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in-up">
      {/* Back link */}
      <a href="/" className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-800 font-medium mb-6 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </a>

      {/* Success banner */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50 animate-check-pop">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Appointment Confirmed!
        </h1>
        <p className="text-cyan-600/70 mt-1 text-sm">
          Your booking has been successfully scheduled
        </p>
      </div>

      {/* Appointment Card */}
      <div className="glass-card rounded-2xl p-6 shadow-xl shadow-cyan-100/40 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">Confirmed</span>
          <span className="text-xs text-cyan-400">ID: #{appointment.id}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Patient */}
          <div className="flex items-center gap-3 p-4 bg-teal-50/60 border border-teal-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-teal-200/50">
              {appointment.patient.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-teal-500 font-medium">Patient</p>
              <p className="text-base font-bold text-teal-900">{appointment.patient.name}</p>
              <p className="text-xs text-teal-500">
                Age: {appointment.patient.age} · {appointment.patient.phone}
              </p>
            </div>
          </div>

          {/* Doctor */}
          <div className="flex items-center gap-3 p-4 bg-cyan-50/60 border border-cyan-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-400 text-white flex items-center justify-center text-lg font-bold shadow-md shadow-cyan-200/50">
              {appointment.doctor.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-cyan-500 font-medium">Doctor</p>
              <p className="text-base font-bold text-cyan-900">{appointment.doctor.name}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-400 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-200/50">
              📅
            </div>
            <div>
              <p className="text-xs text-indigo-500 font-medium">Appointment Date</p>
              <p className="text-base font-bold text-indigo-900">{formattedDate}</p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3 p-4 bg-violet-50/60 border border-violet-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-400 text-white flex items-center justify-center text-lg shadow-md shadow-violet-200/50">
              🕐
            </div>
            <div>
              <p className="text-xs text-violet-500 font-medium">Time Slot</p>
              <p className="text-base font-bold text-violet-900">
                {formatTime12(appointment.slotStartTime)} – {formatTime12(appointment.slotEndTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Remote System */}
        {appointment.remoteSystem && (
          <div className="mt-5 flex items-center gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-400 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-200/50">
              🖥️
            </div>
            <div>
              <p className="text-xs text-emerald-500 font-medium">Remote Consultation System</p>
              <p className="text-base font-bold text-emerald-900">{appointment.remoteSystem.name}</p>
              {appointment.remoteSystem.location && (
                <p className="text-xs text-emerald-500">{appointment.remoteSystem.location}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <a href="/" className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl shadow-md shadow-cyan-200/50 hover:shadow-lg transition-all text-center">
          ← Back to Dashboard
        </a>
        <a href="/appointments/list" className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-cyan-200 text-cyan-800 font-medium rounded-xl hover:bg-cyan-50 transition-all text-center">
          View All Appointments
        </a>
      </div>
    </div>
  );
}
