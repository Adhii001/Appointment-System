"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface RemoteSystem {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  todayAppointments: number;
}

export default function RemoteSystemsPage() {
  const [systems, setSystems] = useState<RemoteSystem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  async function fetchSystems() {
    const res = await fetch("/api/remote-systems");
    const data = await res.json();
    setSystems(data);
    setLoading(false);
  }

  useSocket(fetchSystems);
  useEffect(() => { fetchSystems(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/remote-systems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, location: newLocation }),
    });

    setSubmitting(false);

    if (res.ok) {
      setSuccess("Remote system added successfully!");
      setNewName("");
      setNewLocation("");
      fetchSystems();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add system");
    }
  }

  async function handleToggle(sys: RemoteSystem) {
    await fetch(`/api/remote-systems/${sys.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sys.isActive }),
    });
    fetchSystems();
  }

  async function handleDelete(sys: RemoteSystem) {
    if (!confirm(`Delete "${sys.name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/remote-systems/${sys.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete system");
    } else {
      setSuccess(`"${sys.name}" deleted.`);
      fetchSystems();
    }
  }

  async function handleEditSave(id: number) {
    const res = await fetch(`/api/remote-systems/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, location: editLocation }),
    });
    if (res.ok) {
      setEditId(null);
      setSuccess("System updated.");
      fetchSystems();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update");
    }
  }

  function startEdit(sys: RemoteSystem) {
    setEditId(sys.id);
    setEditName(sys.name);
    setEditLocation(sys.location);
  }

  const activeCount = systems.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
              Infrastructure
            </span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
            Remote Consultation Systems
          </h1>
          <p className="text-sm text-cyan-500 mt-1">
            Manage video-conferencing stations for remote consultations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card rounded-xl px-4 py-2 text-sm">
            <span className="text-cyan-500">Active:</span>{" "}
            <span className="font-bold text-cyan-800">{activeCount}</span>
            <span className="text-cyan-400"> / {systems.length}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-3 animate-fade-in-down">
          <span className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm shadow-md shadow-emerald-200">✓</span>
          <span className="text-sm font-medium flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-3 animate-fade-in-down">
          <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center text-sm">✕</span>
          <span className="text-sm font-medium flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">✕</button>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="glass-card rounded-2xl p-5 shadow-md shadow-cyan-100/30 animate-fade-in-up">
        <h2 className="font-semibold text-cyan-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-xs font-bold flex items-center justify-center shadow-md shadow-indigo-200/50">+</span>
          Add New System
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-cyan-600 mb-1 block">System Name *</label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Remote Station 5"
              className="w-full px-4 py-2.5 border-2 border-cyan-100 rounded-xl bg-white/80 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-cyan-800 font-medium text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-cyan-600 mb-1 block">Location</label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. Room 105"
              className="w-full px-4 py-2.5 border-2 border-cyan-100 rounded-xl bg-white/80 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-cyan-800 font-medium text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || !newName.trim()}
              className="px-6 py-2.5 btn-primary font-semibold rounded-xl shadow-md shadow-cyan-200/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? "Adding..." : "Add System"}
            </button>
          </div>
        </div>
      </form>

      {/* Systems List */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 text-cyan-500 py-16">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading systems…</span>
        </div>
      ) : systems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📺</span>
          </div>
          <p className="text-cyan-600 font-medium">No remote systems configured</p>
          <p className="text-cyan-400 text-sm mt-1">Add your first video-conferencing station above</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-md shadow-cyan-100/30 animate-fade-in-up">
          <div className="px-5 py-4 border-b border-cyan-100/50">
            <h2 className="font-semibold text-cyan-800">All Systems</h2>
            <p className="text-xs text-cyan-400 mt-0.5">{systems.length} system(s) configured</p>
          </div>
          <div className="divide-y divide-cyan-50/60">
            {systems.map((sys) => (
              <div key={sys.id} className="px-5 py-4 hover:bg-cyan-50/30 transition-colors">
                {editId === sys.id ? (
                  /* Edit Mode */
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[150px] px-3 py-2 border-2 border-cyan-200 rounded-xl text-sm font-medium text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Location"
                      className="flex-1 min-w-[150px] px-3 py-2 border-2 border-cyan-200 rounded-xl text-sm font-medium text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button
                      onClick={() => handleEditSave(sys.id)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-4 py-2 border border-cyan-200 text-cyan-600 rounded-xl text-sm font-medium hover:bg-cyan-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm ${
                        sys.isActive
                          ? "bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-indigo-200/50"
                          : "bg-gray-200 text-gray-400"
                      }`}>
                        📺
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-cyan-900 text-sm">{sys.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sys.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-500"
                          }`}>
                            {sys.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                        <div className="text-xs text-cyan-400 mt-0.5 flex items-center gap-2">
                          {sys.location && (
                            <>
                              <span>📍 {sys.location}</span>
                              <span className="w-1 h-1 bg-cyan-300 rounded-full" />
                            </>
                          )}
                          <span>{sys.todayAppointments} consultation(s) today</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(sys)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          sys.isActive
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {sys.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => startEdit(sys)}
                        className="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-semibold hover:bg-cyan-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sys)}
                        className="px-3 py-1.5 bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
