"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";

interface Appointment {
  id: number;
  patientName: string;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  createdAt: string;
  patient: { id: number; name: string; phone: string };
  doctor: { id: number; name: string };
}

interface Doctor {
  id: number;
  name: string;
}

interface Patient {
  id: number;
  name: string;
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterPatient, setFilterPatient] = useState("");

  // Cancel state
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchAppointments = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    if (filterDoctor) params.set("doctorId", filterDoctor);
    if (filterPatient) params.set("patientId", filterPatient);

    const res = await fetch(`/api/appointments?${params}`);
    setAppointments(await res.json());
    setLoading(false);
  }, [filterDate, filterDoctor, filterPatient]);

  useSocket(fetchAppointments);

  useEffect(() => {
    fetch("/api/doctors").then((r) => r.json()).then(setDoctors);
    fetch("/api/patients").then((r) => r.json()).then(setPatients);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleCancel(id: number) {
    setCancelSubmitting(true);
    setCancelError(null);

    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });

    setCancelSubmitting(false);

    if (res.ok) {
      setCancelId(null);
      fetchAppointments();
    } else {
      const data = await res.json();
      setCancelError(data.error || "Failed to cancel appointment");
    }
  }

  function clearFilters() {
    setFilterDate("");
    setFilterDoctor("");
    setFilterPatient("");
  }

  const hasFilters = filterDate || filterDoctor || filterPatient;

  // Group appointments by date for better readability
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const key = appt.appointmentDate;
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div>
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">Manage Appointments</h1>
          <p className="text-sm text-cyan-500 mt-1">
            View and cancel appointments across all dates
          </p>
        </div>
        <div className="text-sm text-cyan-600 glass-card rounded-xl px-3 py-2 shadow-md shadow-cyan-100/30">
          <span className="font-medium text-cyan-800">{appointments.length}</span> appointment
          {appointments.length !== 1 ? "s" : ""} shown
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 mb-6 shadow-md shadow-cyan-100/30 relative z-20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-1 relative z-30">
            <label className="text-xs font-medium text-cyan-500 uppercase tracking-wide">Date</label>
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="All Dates"
            />
          </div>
          <div className="flex flex-col gap-1 relative z-20">
            <label className="text-xs font-medium text-cyan-500 uppercase tracking-wide">Doctor</label>
            <SearchableSelect
              options={[
                { value: "", label: "All Doctors" },
                ...doctors.map(d => ({ value: d.id, label: d.name }))
              ]}
              value={filterDoctor}
              onChange={(val) => setFilterDoctor(String(val))}
              placeholder="All Doctors"
            />
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <label className="text-xs font-medium text-cyan-500 uppercase tracking-wide">Patient</label>
            <SearchableSelect
              options={[
                { value: "", label: "All Patients" },
                ...patients.map(p => ({ value: p.id, label: p.name }))
              ]}
              value={filterPatient}
              onChange={(val) => setFilterPatient(String(val))}
              placeholder="All Patients"
            />
          </div>
          {hasFilters && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-transparent uppercase tracking-wide">.</label>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-cyan-600 border border-cyan-200 rounded-xl hover:bg-cyan-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-cyan-400 text-sm shadow-md shadow-cyan-100/30">
          Loading...
        </div>
      ) : appointments.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-cyan-400 text-sm shadow-md shadow-cyan-100/30">
          {hasFilters ? "No appointments match your filters" : "No appointments found"}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const isToday = date === today;
            const isPast = date < today;
            const isFuture = date > today;

            return (
              <div key={date} className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30">
                <div
                  className={`px-5 py-3 border-b flex items-center gap-3 ${isToday
                      ? "bg-cyan-50/80 border-cyan-200"
                      : isPast
                        ? "bg-gray-50/60 border-gray-200"
                        : "bg-teal-50/80 border-teal-200"
                    }`}
                >
                  <span
                    className={`font-semibold text-sm ${isToday ? "text-cyan-800" : isPast ? "text-gray-500" : "text-teal-800"
                      }`}
                  >
                    {date}
                  </span>
                  {isToday && (
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full">
                      TODAY
                    </span>
                  )}
                  {isFuture && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
                      UPCOMING
                    </span>
                  )}
                  {isPast && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-bold rounded-full">
                      PAST
                    </span>
                  )}
                  <span className="text-xs text-cyan-400 ml-auto">
                    {grouped[date].length} appointment{grouped[date].length !== 1 ? "s" : ""}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-cyan-50/50 text-xs text-cyan-600 uppercase">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Patient</th>
                      <th className="px-5 py-2.5 text-left">Phone</th>
                      <th className="px-5 py-2.5 text-left">Doctor</th>
                      <th className="px-5 py-2.5 text-left">Slot</th>
                      <th className="px-5 py-2.5 text-left">Booked At</th>
                      <th className="px-5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-50">
                    {grouped[date].map((appt) => (
                      <>
                        <tr key={appt.id} className="hover:bg-cyan-50/40 transition-colors">
                          <td className="px-5 py-3 font-medium text-cyan-900">
                            {appt.patient.name}
                          </td>
                          <td className="px-5 py-3 text-cyan-500">{appt.patient.phone}</td>
                          <td className="px-5 py-3 text-cyan-600">{appt.doctor.name}</td>
                          <td className="px-5 py-3 text-cyan-600">{appt.slotStartTime} - {appt.slotEndTime}</td>
                          <td className="px-5 py-3 text-cyan-400 text-xs">
                            {new Date(appt.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => {
                                setCancelId(appt.id);
                                setCancelError(null);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>

                        {cancelId === appt.id && (
                          <tr key={`cancel-${appt.id}`} className="bg-rose-50/60">
                            <td colSpan={6} className="px-5 py-3">
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                  <span className="text-sm font-medium text-rose-800">
                                    Cancel {appt.patient.name}&apos;s appointment with {appt.doctor.name}?
                                  </span>
                                  {isToday && (
                                    <span className="text-xs text-emerald-700 ml-2">
                                      This slot will become available again for {appt.doctor.name}
                                    </span>
                                  )}
                                  {cancelError && (
                                    <div className="text-xs text-rose-700 mt-1">{cancelError}</div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCancel(appt.id)}
                                    disabled={cancelSubmitting}
                                    className="px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors"
                                  >
                                    {cancelSubmitting ? "Cancelling..." : "Yes, Cancel"}
                                  </button>
                                  <button
                                    onClick={() => setCancelId(null)}
                                    className="px-3 py-1.5 bg-white text-cyan-700 text-xs font-medium rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors"
                                  >
                                    Keep It
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
