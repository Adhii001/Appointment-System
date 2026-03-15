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
  availableSlots: number;
  createdAt: string;
  _count: { appointments: number };
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addStart, setAddStart] = useState("10:00");
  const [addEnd, setAddEnd] = useState("16:00");
  const [addDuration, setAddDuration] = useState("30");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchDoctors = useCallback(async () => {
    const res = await fetch("/api/doctors");
    setDoctors(await res.json());
    setLoading(false);
  }, []);

  useSocket(fetchDoctors);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    setAddSuccess(null);

    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName,
        consultStartTime: addStart,
        consultEndTime: addEnd,
        slotDuration: Number(addDuration),
      }),
    });

    setAddSubmitting(false);

    if (res.ok) {
      const doc = await res.json();
      setAddSuccess(`Dr. "${doc.name}" added successfully`);
      setAddName("");
      setAddStart("10:00");
      setAddEnd("16:00");
      setAddDuration("30");
      fetchDoctors();
    } else {
      const data = await res.json();
      setAddError(data.error || "Failed to add doctor");
    }
  }

  function startEdit(doc: Doctor) {
    setEditId(doc.id);
    setEditName(doc.name);
    setEditStart(doc.consultStartTime);
    setEditEnd(doc.consultEndTime);
    setEditDuration(String(doc.slotDuration));
    setEditError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditError(null);
  }

  async function handleEdit(id: number) {
    setEditSubmitting(true);
    setEditError(null);

    const res = await fetch(`/api/doctors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        consultStartTime: editStart,
        consultEndTime: editEnd,
        slotDuration: Number(editDuration),
      }),
    });

    setEditSubmitting(false);

    if (res.ok) {
      setEditId(null);
      fetchDoctors();
    } else {
      const data = await res.json();
      setEditError(data.error || "Failed to update");
    }
  }

  async function handleDelete(id: number) {
    setDeleteSubmitting(true);
    setDeleteError(null);

    const res = await fetch(`/api/doctors/${id}`, { method: "DELETE" });

    setDeleteSubmitting(false);

    if (res.ok) {
      setDeleteId(null);
      fetchDoctors();
    } else {
      const data = await res.json();
      setDeleteError(data.error || "Failed to delete");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">Manage Doctors</h1>
        <p className="text-sm text-cyan-500 mt-1">
          Add, edit, or remove doctors from the system
        </p>
      </div>

      {/* Add Doctor Form */}
      <div className="glass-card rounded-2xl p-6 mb-8 shadow-md shadow-cyan-100/30">
        <h2 className="font-semibold text-cyan-800 mb-4">Add New Doctor</h2>

        {addSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
            {addSuccess}
          </div>
        )}
        {addError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
            {addError}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Doctor name"
            required
            className="flex-1 min-w-48 px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="time"
            value={addStart}
            onChange={(e) => setAddStart(e.target.value)}
            required
            className="px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="time"
            value={addEnd}
            onChange={(e) => setAddEnd(e.target.value)}
            required
            className="px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={addDuration}
              onChange={(e) => setAddDuration(e.target.value)}
              min={5}
              max={120}
              required
              className="w-24 px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <span className="text-sm text-cyan-500 whitespace-nowrap">min/slot</span>
          </div>
          <button
            type="submit"
            disabled={addSubmitting}
            className="px-6 py-2.5 btn-primary text-sm font-semibold rounded-xl disabled:opacity-50 shadow-md shadow-cyan-200/50"
          >
            {addSubmitting ? "Adding..." : "Add Doctor"}
          </button>
        </form>
      </div>

      {/* Doctors Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30">
        <div className="px-5 py-4 border-b border-cyan-100/50 flex items-center justify-between">
          <h2 className="font-semibold text-cyan-800">
            All Doctors{" "}
            <span className="text-cyan-400 font-normal">({doctors.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-cyan-400 text-sm">Loading...</div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center text-cyan-400 text-sm">No doctors found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cyan-50/50 text-xs text-cyan-600 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Consulting Hours</th>
                  <th className="px-5 py-3 text-left">Slot Duration</th>
                  <th className="px-5 py-3 text-left">Today Slots</th>
                  <th className="px-5 py-3 text-left">Total Appointments</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-50">
                {doctors.map((doc) => (
                  <>
                    <tr
                      key={doc.id}
                      className="hover:bg-cyan-50/40 transition-colors"
                    >
                      {editId === doc.id ? (
                        // Inline edit row
                        <>
                          <td className="px-5 py-3" colSpan={5}>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                              <input
                                type="time"
                                value={editStart}
                                onChange={(e) => setEditStart(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                              <input
                                type="time"
                                value={editEnd}
                                onChange={(e) => setEditEnd(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={editDuration}
                                  onChange={(e) => setEditDuration(e.target.value)}
                                  min={5}
                                  max={120}
                                  className="w-20 px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                                <span className="text-xs text-gray-500">min/slot</span>
                              </div>
                            </div>
                            {editError && (
                              <div className="mt-2 text-xs text-red-600">{editError}</div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right" colSpan={2}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(doc.id)}
                                disabled={editSubmitting}
                                className="px-3 py-1.5 btn-primary text-xs font-medium rounded-lg disabled:opacity-50"
                              >
                                {editSubmitting ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-xs font-medium rounded-lg hover:bg-cyan-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        // Normal row
                        <>
                          <td className="px-5 py-3 font-medium text-gray-900">
                            {doc.name}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {doc.consultStartTime} - {doc.consultEndTime}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {doc.slotDuration} min
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {doc.totalSlots - doc.availableSlots}/{doc.totalSlots}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {doc._count.appointments}
                          </td>
                          <td className="px-5 py-3">
                            {doc.availableSlots > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-600">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                Full
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(doc)}
                                className="px-3 py-1.5 text-xs font-medium text-cyan-600 border border-cyan-200 rounded-lg hover:bg-cyan-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(doc.id);
                                  setDeleteError(null);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Delete confirmation row */}
                    {deleteId === doc.id && (
                      <tr key={`del-${doc.id}`} className="bg-rose-50/60">
                        <td colSpan={7} className="px-5 py-3">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <span className="text-sm font-medium text-rose-800">
                                Delete &ldquo;{doc.name}&rdquo;?
                              </span>
                              <span className="text-xs text-rose-500 ml-2">
                                This action cannot be undone.
                              </span>
                              {deleteError && (
                                <div className="text-xs text-rose-700 mt-1">{deleteError}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleteSubmitting}
                                className="px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors"
                              >
                                {deleteSubmitting ? "Deleting..." : "Yes, Delete"}
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="px-3 py-1.5 bg-white text-gray-700 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                Cancel
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
        )}
      </div>
    </div>
  );
}
