"use client";
// src/app/dashboard/sales/page.tsx
import { useEffect, useState, useCallback } from "react";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react";

interface Lead {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  hasPersonalDetails: boolean;
  hasUploadedSlip: boolean;
  loanStatus: string | null;
}

interface StatsData {
  total: number;
  withDetails: number;
  withSlip: number;
  applied: number;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SalesContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({ total: 0, withDetails: 0, withSlip: 0, applied: 0 });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getLeads(page);
      const { data, total: t, stats: s } = res.data.data;
      setLeads(data || []);
      setTotal(t || 0);
      if (s) setStats(s);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const getProgress = (lead: Lead) => {
    if (lead.loanStatus) return 100;
    if (lead.hasUploadedSlip) return 66;
    if (lead.hasPersonalDetails) return 33;
    return 0;
  };

  const columns = [
    {
      key: "name",
      header: "Borrower",
      render: (row: Lead) => (
        <div>
          <p className="font-semibold text-slate-800">{row.name}</p>
          <p className="text-xs text-slate-400">{row.email}</p>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Application Progress",
      render: (row: Lead) => {
        const pct = getProgress(row);
        return (
          <div className="w-40">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Step {pct === 0 ? 0 : pct === 33 ? 1 : pct === 66 ? 2 : 3}/3</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "details",
      header: "Details",
      render: (row: Lead) => (
        <div className="flex gap-2">
          <span className={`badge text-xs ${row.hasPersonalDetails ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
            {row.hasPersonalDetails ? "✓ Profile" : "No Profile"}
          </span>
          <span className={`badge text-xs ${row.hasUploadedSlip ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
            {row.hasUploadedSlip ? "✓ Slip" : "No Slip"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Loan Status",
      render: (row: Lead) => (
        row.loanStatus ? (
          <span className={`status-${row.loanStatus}`}>
            {row.loanStatus.charAt(0).toUpperCase() + row.loanStatus.slice(1)}
          </span>
        ) : (
          <span className="text-slate-400 text-xs italic">Not applied</span>
        )
      ),
    },
    {
      key: "registered",
      header: "Registered",
      render: (row: Lead) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Sales — Lead Tracking</h1>
        <p className="text-slate-500 text-sm mt-0.5">Monitor borrowers who have registered on the platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Leads" value={stats.total} color="bg-sky-500" />
        <StatCard icon={UserCheck} label="Profile Complete" value={stats.withDetails} color="bg-indigo-500" />
        <StatCard icon={Clock} label="Slip Uploaded" value={stats.withSlip} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Applied" value={stats.applied} color="bg-emerald-500" />
      </div>

      <DataTable
        columns={columns}
        data={leads}
        total={total}
        page={page}
        limit={10}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No leads registered yet"
        emptyIcon={<Users size={40} />}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <RoleGuard allowedRoles={["admin", "sales"]}>
      <SalesContent />
    </RoleGuard>
  );
}
