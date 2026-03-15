"use client";

import { useEffect, useState, useCallback } from "react";

interface Patient {
  id: number;
  name: string;
  phone: string;
  age: number;
  createdAt: string;
  _count?: { appointments: number };
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add form
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAge, setAddAge] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchPatients = useCallback(async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();
    // Fetch appointment counts
    const apptRes = await fetch("/api/appointments");
    const appts = await apptRes.json();
    const countMap: Record<number, number> = {};
    for (const appt of appts) {
      countMap[appt.patientId] = (countMap[appt.patientId] || 0) + 1;
    }
    const enriched = data.map((p: Patient) => ({
      ...p,
      _count: { appointments: countMap[p.id] || 0 },
    }));
    setPatients(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    setAddSuccess(null);

    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, phone: addPhone, age: Number(addAge) }),
    });

    setAddSubmitting(false);

    if (res.ok) {
      const patient = await res.json();
      setAddSuccess(`"${patient.name}" registered successfully`);
      setAddName("");
      setAddPhone("");
      setAddAge("");
      fetchPatients();
    } else {
      const data = await res.json();
      setAddError(data.error || "Failed to add patient");
    }
  }

  function startEdit(p: Patient) {
    setEditId(p.id);
    setEditName(p.name);
    setEditPhone(p.phone);
    setEditAge(String(p.age));
    setEditError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditError(null);
  }

  async function handleEdit(id: number) {
    setEditSubmitting(true);
    setEditError(null);

    const res = await fetch(`/api/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, phone: editPhone, age: Number(editAge) }),
    });

    setEditSubmitting(false);

    if (res.ok) {
      setEditId(null);
      fetchPatients();
    } else {
      const data = await res.json();
      setEditError(data.error || "Failed to update");
    }
  }

  async function handleDelete(id: number) {
    setDeleteSubmitting(true);
    setDeleteError(null);

    const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });

    setDeleteSubmitting(false);

    if (res.ok) {
      setDeleteId(null);
      fetchPatients();
    } else {
      const data = await res.json();
      setDeleteError(data.error || "Failed to delete");
    }
  }

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">Manage Patients</h1>
        <p className="text-sm text-cyan-500 mt-1">
          Register new patients or update existing records
        </p>
      </div>

      {/* Add Patient Form */}
      <div className="glass-card rounded-2xl p-6 mb-8 shadow-md shadow-cyan-100/30">
        <h2 className="font-semibold text-cyan-800 mb-4">Register New Patient</h2>

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
            placeholder="Full name"
            required
            className="flex-1 min-w-40 px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="tel"
            value={addPhone}
            onChange={(e) => setAddPhone(e.target.value)}
            placeholder="Phone number"
            required
            className="w-40 px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <input
            type="number"
            value={addAge}
            onChange={(e) => setAddAge(e.target.value)}
            placeholder="Age"
            min={1}
            max={150}
            required
            className="w-20 px-4 py-2.5 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="submit"
            disabled={addSubmitting}
            className="px-6 py-2.5 btn-primary text-sm font-semibold rounded-xl disabled:opacity-50 shadow-md shadow-cyan-200/50"
          >
            {addSubmitting ? "Registering..." : "Add Patient"}
          </button>
        </form>
      </div>

      {/* Patients Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30">
        <div className="px-5 py-4 border-b border-cyan-100/50 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold text-cyan-800">
            All Patients{" "}
            <span className="text-cyan-400 font-normal">({patients.length})</span>
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="px-4 py-2 text-sm border border-cyan-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-60"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-cyan-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-cyan-400 text-sm">
            {search ? "No patients match your search" : "No patients found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cyan-50/50 text-xs text-cyan-600 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Phone</th>
                  <th className="px-5 py-3 text-left">Age</th>
                  <th className="px-5 py-3 text-left">Appointments</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-50">
                {filtered.map((p) => (
                  <>
                    <tr key={p.id} className="hover:bg-cyan-50/40 transition-colors">
                      {editId === p.id ? (
                        <>
                          <td className="px-5 py-3" colSpan={3}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 min-w-32 px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-36 px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                              <input
                                type="number"
                                value={editAge}
                                onChange={(e) => setEditAge(e.target.value)}
                                min={1}
                                max={150}
                                className="w-16 px-3 py-1.5 text-sm border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                              />
                            </div>
                            {editError && (
                              <div className="mt-2 text-xs text-rose-600">{editError}</div>
                            )}
                          </td>
                          <td className="px-5 py-3" />
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(p.id)}
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
                        <>
                          <td className="px-5 py-3 font-medium text-cyan-900">{p.name}</td>
                          <td className="px-5 py-3 text-cyan-600">{p.phone}</td>
                          <td className="px-5 py-3 text-cyan-600">{p.age} yrs</td>
                          <td className="px-5 py-3 text-cyan-600">
                            {p._count?.appointments ?? 0}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(p)}
                                className="px-3 py-1.5 text-xs font-medium text-cyan-600 border border-cyan-200 rounded-lg hover:bg-cyan-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteId(p.id);
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

                    {deleteId === p.id && (
                      <tr key={`del-${p.id}`} className="bg-rose-50/60">
                        <td colSpan={5} className="px-5 py-3">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div>
                              <span className="text-sm font-medium text-rose-800">
                                Delete &ldquo;{p.name}&rdquo;?
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
                                onClick={() => handleDelete(p.id)}
                                disabled={deleteSubmitting}
                                className="px-3 py-1.5 bg-rose-500 text-white text-xs font-medium rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors"
                              >
                                {deleteSubmitting ? "Deleting..." : "Yes, Delete"}
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="px-3 py-1.5 bg-white text-cyan-700 text-xs font-medium rounded-lg border border-cyan-200 hover:bg-cyan-50 transition-colors"
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
