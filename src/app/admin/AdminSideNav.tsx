"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/doctors", label: "Doctors", icon: "👨‍⚕️" },
  { href: "/admin/patients", label: "Patients", icon: "🧑‍🤝‍🧑" },
  { href: "/admin/appointments", label: "Appointments", icon: "📅" },
  { href: "/admin/remote-systems", label: "Remote Systems", icon: "📺" },
  { href: "/admin/consultation-monitor", label: "Live Monitor", icon: "🖥️" },
];

export default function AdminSideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 glass-card flex-shrink-0 border-r border-cyan-200/40">
      <div className="p-5 border-b border-cyan-200/40">
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-500">
          Admin Panel
        </span>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/10 to-teal-500/10 text-cyan-700 shadow-sm"
                  : "text-gray-600 hover:bg-cyan-50 hover:text-cyan-700"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
