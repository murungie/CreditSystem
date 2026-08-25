"use client";
// src/app/dashboard/layout.tsx
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import {
  TrendingUp, Users, Shield, Banknote, CreditCard,
  LayoutDashboard, LogOut, Menu, X, ChevronRight
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
  color: string;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard/sales",
    label: "Sales",
    icon: Users,
    roles: ["admin", "sales"],
    color: "text-sky-600",
  },
  {
    href: "/dashboard/sanction",
    label: "Sanction",
    icon: Shield,
    roles: ["admin", "sanction"],
    color: "text-amber-600",
  },
  {
    href: "/dashboard/disbursement",
    label: "Disbursement",
    icon: Banknote,
    roles: ["admin", "disbursement"],
    color: "text-purple-600",
  },
  {
    href: "/dashboard/collection",
    label: "Collection",
    icon: CreditCard,
    roles: ["admin", "collection"],
    color: "text-emerald-600",
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
    } else if (user.role === "borrower") {
      router.replace("/borrower");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const allowedNav = navItems.filter((item) => item.roles.includes(user.role));

  const roleColors: Record<string, string> = {
    admin: "bg-brand-600",
    sales: "bg-sky-600",
    sanction: "bg-amber-600",
    disbursement: "bg-purple-600",
    collection: "bg-emerald-600",
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white">
          <TrendingUp size={17} />
        </div>
        <div>
          <span className="font-display font-bold text-slate-800 text-base block leading-tight">LoanFlow</span>
          <span className="text-xs text-slate-400">Operations</span>
        </div>
      </div>

      {/* User badge */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className={`w-8 h-8 rounded-lg ${roleColors[user.role] || "bg-slate-500"} flex items-center justify-center text-white text-xs font-bold`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">Modules</p>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                ${active
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-500/30"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <Icon size={18} className={active ? "text-white" : item.color} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 w-full transition-all"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-white border-r border-slate-100 shadow-sm">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 h-full bg-white shadow-2xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-6 h-16 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
              {pathname !== "/dashboard" && (
                <>
                  <ChevronRight size={12} />
                  <span className="font-medium text-slate-800 capitalize">
                    {pathname.split("/").pop()}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${roleColors[user.role] || "bg-slate-500"} text-white text-xs capitalize`}>
              {user.role}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
