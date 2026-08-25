"use client";
// src/app/dashboard/collection/page.tsx
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { dashboardApi } from "@/lib/api";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { DataTable } from "@/components/dashboard/DataTable";
import { Loan } from "@/types";
import { formatCurrency } from "@/lib/bre";
import { CreditCard, Plus, X, IndianRupee, Hash, Calendar, AlertCircle } from "lucide-react";

// ─── Payment Modal ─────────────────────────────────────────
function PaymentModal({
  loan,
  onClose,
  onSuccess,
}: {
  loan: Loan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    utrNumber: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);

  const outstanding = (loan.loanConfig?.totalRepayment || 0) - (loan.totalPaid || 0);
  const borrower = typeof loan.borrower === "object" ? loan.borrower : null;

  const validate = () => {
    if (!form.utrNumber.trim()) return "UTR number is required";
    if (form.utrNumber.length < 6) return "UTR must be at least 6 characters";
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return "Enter a valid payment amount";
    if (amt > outstanding) return `Amount cannot exceed outstanding balance of ${formatCurrency(outstanding)}`;
    if (!form.date) return "Payment date is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setLoading(true);
    try {
      await dashboardApi.recordPayment(loan._id, {
        utrNumber: form.utrNumber.trim(),
        amount: parseFloat(form.amount),
        date: form.date,
      });
      const newPaid = (loan.totalPaid || 0) + parseFloat(form.amount);
      const isClosing = newPaid >= (loan.loanConfig?.totalRepayment || 0);
      toast.success(isClosing ? "✅ Loan fully repaid — now closed!" : "Payment recorded successfully");
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to record payment. Check UTR uniqueness.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const paidPct = loan.loanConfig
    ? Math.min(((loan.totalPaid || 0) / loan.loanConfig.totalRepayment) * 100, 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="font-display text-xl font-bold text-slate-900">Record Payment</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* Loan Summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-slate-500 mb-2">Loan Summary — {borrower?.name}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Repayment</span>
                <span className="font-bold">{formatCurrency(loan.loanConfig?.totalRepayment || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paid So Far</span>
                <span className="font-bold text-emerald-600">{formatCurrency(loan.totalPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-600 font-semibold">Outstanding</span>
                <span className="font-bold text-red-600">{formatCurrency(outstanding)}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{paidPct.toFixed(1)}% repaid</p>
            </div>
          </div>

          {outstanding <= 0 ? (
            <div className="flex gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <AlertCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 font-medium">This loan has been fully repaid.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">UTR Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Hash size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    className="input-field pl-9 font-mono uppercase"
                    type="text"
                    placeholder="HDFC2024XXXXXXXX"
                    value={form.utrNumber}
                    onChange={(e) => setForm({ ...form, utrNumber: e.target.value.toUpperCase() })}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Must be unique across all payments</p>
              </div>

              <div>
                <label className="label">Payment Amount (₹) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    className="input-field pl-9"
                    type="number"
                    placeholder="Enter amount"
                    min={1}
                    max={outstanding}
                    step={0.01}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Max: {formatCurrency(outstanding)}</p>
              </div>

              <div>
                <label className="label">Payment Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    className="input-field pl-9"
                    type="date"
                    value={form.date}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Plus size={15} /> Record Payment</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Collection Content ────────────────────────────────────
function CollectionContent() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getDisbursedLoans(page);
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
      header: "Total Repayment",
      render: (row: Loan) => (
        <span className="font-bold font-mono text-slate-900">
          {row.loanConfig ? formatCurrency(row.loanConfig.totalRepayment) : "—"}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      render: (row: Loan) => (
        <span className="font-semibold font-mono text-emerald-600">
          {formatCurrency(row.totalPaid || 0)}
        </span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      render: (row: Loan) => {
        const outstanding = (row.loanConfig?.totalRepayment || 0) - (row.totalPaid || 0);
        return (
          <span className={`font-mono font-semibold text-sm ${outstanding <= 0 ? "text-emerald-500" : "text-red-600"}`}>
            {outstanding <= 0 ? "Fully Paid" : formatCurrency(outstanding)}
          </span>
        );
      },
    },
    {
      key: "progress",
      header: "Progress",
      render: (row: Loan) => {
        const pct = row.loanConfig
          ? Math.min(((row.totalPaid || 0) / row.loanConfig.totalRepayment) * 100, 100)
          : 0;
        return (
          <div className="w-28">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{pct.toFixed(0)}%</p>
          </div>
        );
      },
    },
    {
      key: "payments",
      header: "Payments",
      render: (row: Loan) => (
        <span className="badge bg-slate-100 text-slate-600">{row.payments?.length || 0} recorded</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Loan) => <span className={`status-${row.status}`}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span>,
    },
    {
      key: "actions",
      header: "Action",
      render: (row: Loan) =>
        row.status === "disbursed" ? (
          <button
            onClick={() => setSelectedLoan(row)}
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} /> Add Payment
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Loan Closed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <CreditCard size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Collection Module</h1>
          <p className="text-slate-500 text-sm">Track repayments and record borrower payments</p>
        </div>
        <span className="ml-auto badge bg-emerald-50 text-emerald-700 text-sm px-3 py-1.5">
          {total} active loans
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
        emptyMessage="No disbursed loans to collect"
        emptyIcon={<CreditCard size={40} />}
      />

      {selectedLoan && (
        <PaymentModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onSuccess={() => {
            setSelectedLoan(null);
            fetchLoans();
          }}
        />
      )}
    </div>
  );
}

export default function CollectionPage() {
  return (
    <RoleGuard allowedRoles={["admin", "collection"]}>
      <CollectionContent />
    </RoleGuard>
  );
}
