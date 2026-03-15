"use client";

import { useState } from "react";

export default function AddPatientPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, age: Number(age) }),
    });

    setSubmitting(false);

    if (res.ok) {
      const patient = await res.json();
      setSuccess(`Patient "${patient.name}" added successfully!`);
      setName("");
      setPhone("");
      setAge("");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add patient");
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">Add New Patient</h1>
        <p className="text-cyan-500 mt-1">Register a new patient in the system</p>
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

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5 shadow-md shadow-cyan-100/30">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-cyan-700 mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
            placeholder="Enter patient's full name"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-cyan-700 mb-1">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label htmlFor="age" className="block text-sm font-medium text-cyan-700 mb-1">
            Age
          </label>
          <input
            id="age"
            type="number"
            required
            min={1}
            max={150}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2.5 border border-cyan-200 rounded-xl bg-white/70 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition"
            placeholder="Enter age"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 btn-primary font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-cyan-200/50"
        >
          {submitting ? "Adding..." : "Add Patient"}
        </button>
      </form>
    </div>
  );
}
