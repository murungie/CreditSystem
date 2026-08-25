"use client";
// src/app/dashboard/disbursement/page.tsx
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Loan } from "@/types";
import { formatCurrency } from "@/lib/bre";
import { Banknote, Send, CheckCircle2 } from "lucide-react";

function DisburseConfirmModal({
  loan,
  onClose,
  onConfirm,
}: {
  loan: Loan;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const borrower = typeof loan.borrower === "object" ? loan.borrower : null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
            <Banknote size={30} className="text-purple-600" />
          </div>
          <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Confirm Disbursement</h3>
          <p className="text-slate-500 text-sm mb-6">
            You are about to disburse funds to <span className="font-semibold text-slate-700">{borrower?.name}</span>
          </p>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Loan Amount</span>
              <span className="font-bold text-slate-900">{formatCurrency(loan.loanConfig?.amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tenure</span>
              <span className="font-semibold">{loan.loanConfig?.tenure} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Repayment</span>
              <span className="font-bold text-purple-700">{formatCurrency(loan.loanConfig?.totalRepayment || 0)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send size={15} /> Disburse Funds</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisbursementContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getSanctionedLoans(page);
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

  const handleDisburse = async () => {
    if (!selectedLoan) return;
    try {
      await dashboardApi.disburseLoan(selectedLoan._id);
      toast.success("Loan disbursed! Funds released to borrower 💸");
      setSelectedLoan(null);
      fetchLoans();
    } catch {
      toast.error("Disbursement failed. Try again.");
    }
  };

  const columns = [
    {
      key: "borrower",
      header: "Borrower",
      render: (row: Loan) => {
        const b = typeof row.borrower === "object" ? row.borrower : null;
        return (
          <div>
            <p className="font-semibold text-slate-800">{b?.name || "—"}</p>
            <p className="text-xs text-slate-400">{b?.email || "—"}</p>
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
      key: "repayment",
      header: "Total Repayment",
      render: (row: Loan) => (
        <span className="font-mono text-sm text-purple-700 font-semibold">
          {row.loanConfig ? formatCurrency(row.loanConfig.totalRepayment) : "—"}
        </span>
      ),
    },
    {
      key: "tenure",
      header: "Tenure",
      render: (row: Loan) => <span>{row.loanConfig?.tenure || "—"} days</span>,
    },
    {
      key: "sanctioned",
      header: "Sanctioned On",
      render: (row: Loan) => (
        <span className="text-xs text-slate-500">
          {new Date(row.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => <span className="status-sanctioned">Sanctioned</span>,
    },
    {
      key: "actions",
      header: "Action",
      render: (row: Loan) => (
        <button
          onClick={() => setSelectedLoan(row)}
          className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-all"
        >
          <Send size={13} /> Disburse
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Banknote size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Disbursement Module</h1>
          <p className="text-slate-500 text-sm">Release funds for sanctioned loans</p>
        </div>
        <span className="ml-auto badge bg-purple-50 text-purple-700 text-sm px-3 py-1.5">
          {total} ready to disburse
        </span>
      </div>

      {loans.length === 0 && !loading && (
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={40} className="text-slate-300" />
          <p className="text-slate-500 font-medium">No sanctioned loans pending disbursement</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={loans}
        total={total}
        page={page}
        limit={10}
        loading={loading}
        onPageChange={setPage}
        emptyMessage="No sanctioned loans ready for disbursement"
        emptyIcon={<Banknote size={40} />}
      />

      {selectedLoan && (
        <DisburseConfirmModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onConfirm={handleDisburse}
        />
      )}
    </div>
  );
}

export default function DisbursementPage() {
  return (
    <RoleGuard allowedRoles={["admin", "disbursement"]}>
      <DisbursementContent />
    </RoleGuard>
  );
}
