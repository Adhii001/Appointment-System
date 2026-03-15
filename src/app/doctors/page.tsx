"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";

interface Doctor {
  id: number;
  name: string;
  consultStartTime: string;
  consultEndTime: string;
  slotDuration: number;
  totalSlots: number;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [name, setName] = useState("");
  const [consultStartTime, setConsultStartTime] = useState("10:00");
  const [consultEndTime, setConsultEndTime] = useState("16:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    setDoctors(await res.json());
  }, []);

  useSocket(fetchDoctors);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        consultStartTime,
        consultEndTime,
        slotDuration: Number(slotDuration),
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      const doctor = await res.json();
      setSuccess(`Doctor "${doctor.name}" added successfully!`);
      setName("");
      setConsultStartTime("10:00");
      setConsultEndTime("16:00");
      setSlotDuration("30");
      fetchDoctors();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add doctor");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">Add Doctor</h1>
        <p className="text-cyan-500 mt-1">Register a new doctor in the system</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5 mb-8 shadow-md shadow-cyan-100/30">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-cyan-700 mb-1">
            Doctor Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
            placeholder="e.g. Dr. John Smith"
          />
        </div>

        <div>
          <label htmlFor="consultStart" className="block text-sm font-medium text-cyan-700 mb-1">
            Consulting Start Time
          </label>
          <input
            id="consultStart"
            type="time"
            required
            value={consultStartTime}
            onChange={(e) => setConsultStartTime(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="consultEnd" className="block text-sm font-medium text-cyan-700 mb-1">
            Consulting End Time
          </label>
          <input
            id="consultEnd"
            type="time"
            required
            value={consultEndTime}
            onChange={(e) => setConsultEndTime(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
          />
        </div>

        <div>
          <label htmlFor="slotDuration" className="block text-sm font-medium text-cyan-700 mb-1">
            Slot Duration (minutes)
          </label>
          <input
            id="slotDuration"
            type="number"
            required
            min={5}
            max={120}
            value={slotDuration}
            onChange={(e) => setSlotDuration(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
          />
          <p className="text-xs text-cyan-400 mt-1">Default schedule is 10:00 to 16:00 with 30-minute slots</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 btn-primary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-cyan-200/50"
        >
          {submitting ? "Adding..." : "Add Doctor"}
        </button>
      </form>

      {/* Existing Doctors List */}
      <div>
        <h2 className="text-xl font-semibold text-cyan-800 mb-4">
          Existing Doctors ({doctors.length})
        </h2>
        <div className="space-y-2">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between glass-card rounded-xl px-4 py-3 shadow-sm shadow-cyan-100/30"
            >
              <span className="font-medium text-cyan-900">{doc.name}</span>
              <span className="text-sm text-cyan-500">
                {doc.consultStartTime}-{doc.consultEndTime} ({doc.slotDuration}m, {doc.totalSlots} slots)
              </span>
            </div>
          ))}
          {doctors.length === 0 && (
            <p className="text-cyan-400 text-sm italic">No doctors yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
