"use client";
// src/app/dashboard/sanction/page.tsx
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Loan } from "@/types";
import { formatCurrency } from "@/lib/bre";
import { Shield, CheckCircle, XCircle, FileText, Eye, X } from "lucide-react";

// ─── Loan Detail Modal ─────────────────────────────────────
function LoanDetailModal({
  loan,
  onClose,
  onApprove,
  onReject,
}: {
  loan: Loan;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState("");

  const pd = loan.personalDetails;
  const cfg = loan.loanConfig;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-display text-xl font-bold text-slate-900">Loan Application</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Borrower Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Borrower Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Full Name", value: pd?.fullName },
                { label: "PAN", value: pd?.pan },
                { label: "Date of Birth", value: pd?.dateOfBirth ? new Date(pd.dateOfBirth).toLocaleDateString("en-IN") : "-" },
                { label: "Employment", value: pd?.employmentMode?.replace("_", " ") },
                { label: "Monthly Salary", value: pd?.monthlySalary ? formatCurrency(pd.monthlySalary) : "-" },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5 capitalize">{item.value || "-"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Loan Config */}
          {cfg && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Loan Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Principal", value: formatCurrency(cfg.amount) },
                  { label: "Tenure", value: `${cfg.tenure} days` },
                  { label: "Interest (12% SI)", value: formatCurrency(cfg.simpleInterest) },
                  { label: "Total Repayment", value: formatCurrency(cfg.totalRepayment) },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Salary Slip */}
          {loan.salarySlipUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Documents</p>
              <a
                href={loan.salarySlipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-brand-50 transition-colors group"
              >
                <FileText size={18} className="text-red-500" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700">View Salary Slip</span>
                <Eye size={14} className="ml-auto text-slate-400" />
              </a>
            </div>
          )}

          {/* Actions */}
          {rejectMode ? (
            <div className="space-y-3">
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="Enter rejection reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectMode(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => { if (reason.trim()) onReject(reason); else toast.error("Please enter a reason"); }}
                  className="btn-danger flex-1"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRejectMode(true)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <XCircle size={16} /> Reject
              </button>
              <button onClick={onApprove} className="btn-success flex-1 flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sanction Content ─────────────────────────────────────
function SanctionContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAppliedLoans(page);
      const { data, total: t } = res.data.data;
      setLoans(data || []);
      setTotal(t || 0);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const handleApprove = async (loanId: string) => {
    try {
      await dashboardApi.sanctionLoan(loanId);
      toast.success("Loan sanctioned successfully ✓");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Failed to sanction loan");
    }
  };

  const handleReject = async (loanId: string, reason: string) => {
    try {
      await dashboardApi.rejectLoan(loanId, reason);
      toast.success("Loan rejected");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Failed to reject loan");
    }
  };

  const columns = [
    {
      key: "borrower",
      header: "Borrower",
      render: (row: Loan) => {
        const borrower = typeof row.borrower === "object" ? row.borrower : null;
        return (
          <div>
            <p className="font-semibold text-slate-800">{borrower?.name || "—"}</p>
            <p className="text-xs text-slate-400">{borrower?.email || "—"}</p>
          </div>
        );
      },
    },
    {
      key: "amount",
      header: "Loan Amount",
      render: (row: Loan) => (
        <span className="font-bold font-mono text-slate-900">
          {row.loanConfig ? formatCurrency(row.loanConfig.amount) : "—"}
        </span>
      ),
    },
    {
      key: "tenure",
      header: "Tenure",
      render: (row: Loan) => <span>{row.loanConfig?.tenure || "—"} days</span>,
    },
    {
      key: "repayment",
      header: "Total Repayment",
      render: (row: Loan) => (
        <span className="font-mono text-sm">
          {row.loanConfig ? formatCurrency(row.loanConfig.totalRepayment) : "—"}
        </span>
      ),
    },
    {
      key: "applied",
      header: "Applied On",
      render: (row: Loan) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Loan) => (
        <button
          onClick={() => setSelectedLoan(row)}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
        >
          <Eye size={15} /> Review
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Shield size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Sanction Module</h1>
          <p className="text-slate-500 text-sm">Review and approve or reject loan applications</p>
        </div>
        <span className="ml-auto badge bg-amber-50 text-amber-700 text-sm px-3 py-1.5">
          {total} pending
        </span>
      </div>

      <DataTable
        columns={columns}
        data={loans}
        total={total}
        page={page}
        limit={10}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No applications pending review"
        emptyIcon={<Shield size={40} />}
      />

      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onApprove={() => handleApprove(selectedLoan._id)}
          onReject={(reason) => handleReject(selectedLoan._id, reason)}
        />
      )}
    </div>
  );
}

export default function SanctionPage() {
  return (
    <RoleGuard allowedRoles={["admin", "sanction"]}>
      <SanctionContent />
    </RoleGuard>
  );
}
