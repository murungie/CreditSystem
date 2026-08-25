"use client";
// src/app/borrower/page.tsx
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { borrowerApi } from "@/lib/api";
import { runClientBRE, calculateLoan, formatCurrency } from "@/lib/bre";
import { Loan } from "@/types";
import {
  User, FileText, Upload, Sliders, CheckCircle2,
  AlertCircle, ChevronRight, IndianRupee, Calendar,
  TrendingUp, Clock, X, BadgeCheck
} from "lucide-react";

// ─── Step Indicator ─────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = [
    { icon: User, label: "Personal Details" },
    { icon: Upload, label: "Salary Slip" },
    { icon: Sliders, label: "Loan Config" },
  ];

  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const num = idx + 1;
        const done = current > num;
        const active = current === num;
        return (
          <div key={num} className="flex items-center">
            <div className={`flex flex-col items-center gap-1.5 ${active ? "opacity-100" : done ? "opacity-100" : "opacity-40"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300
                ${done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" : "bg-slate-200 text-slate-500"}`}>
                {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? "text-brand-700" : done ? "text-emerald-600" : "text-slate-400"}`}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-4 transition-all duration-300 ${current > num ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Loan Status Card ────────────────────────────────────
function LoanStatusCard({ loan }: { loan: Loan }) {
  const statusColors: Record<string, string> = {
    pending: "text-slate-600 bg-slate-100",
    applied: "text-blue-700 bg-blue-100",
    sanctioned: "text-amber-700 bg-amber-100",
    disbursed: "text-purple-700 bg-purple-100",
    closed: "text-emerald-700 bg-emerald-100",
    rejected: "text-red-700 bg-red-100",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pending Review",
    applied: "Under Review",
    sanctioned: "Sanctioned ✓",
    disbursed: "Disbursed 💸",
    closed: "Loan Closed ✅",
    rejected: "Rejected",
  };

  const cfg = loan.loanConfig;
  const paidPct = cfg ? Math.min((loan.totalPaid / cfg.totalRepayment) * 100, 100) : 0;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-slate-900">Your Loan Application</h2>
        <p className="text-slate-500 mt-1">Track your loan status in real-time</p>
      </div>

      <div className="card p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-500 font-medium">Application ID</p>
            <p className="font-mono text-sm text-slate-700 mt-0.5">{loan._id.slice(-12).toUpperCase()}</p>
          </div>
          <span className={`badge text-sm px-3 py-1.5 font-semibold self-start sm:self-center ${statusColors[loan.status]}`}>
            {statusLabels[loan.status]}
          </span>
        </div>

        {loan.status === "rejected" && loan.rejectionReason && (
          <div className="mb-6 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Rejection Reason</p>
              <p className="text-sm text-red-600 mt-0.5">{loan.rejectionReason}</p>
            </div>
          </div>
        )}

        {cfg && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Loan Amount", value: formatCurrency(cfg.amount), icon: IndianRupee },
              { label: "Tenure", value: `${cfg.tenure} days`, icon: Calendar },
              { label: "Interest (SI)", value: formatCurrency(cfg.simpleInterest), icon: TrendingUp },
              { label: "Total Repayment", value: formatCurrency(cfg.totalRepayment), icon: BadgeCheck },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                <p className="font-bold text-slate-900 mt-1 text-sm sm:text-base">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {(loan.status === "disbursed" || loan.status === "closed") && cfg && (
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 font-medium">Repayment Progress</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(loan.totalPaid)} / {formatCurrency(cfg.totalRepayment)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-brand-500 to-emerald-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{paidPct.toFixed(1)}% paid</p>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Loan Journey</p>
          <div className="flex items-center gap-0">
            {["applied", "sanctioned", "disbursed", "closed"].map((s, i, arr) => {
              const statusOrder = ["applied", "sanctioned", "disbursed", "closed"];
              const currentIdx = statusOrder.indexOf(loan.status);
              const done = currentIdx >= i;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${done ? "border-brand-500 bg-brand-500" : "border-slate-300 bg-white"}`}>
                      {done && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-[10px] text-slate-500 capitalize hidden sm:block">{s}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${currentIdx > i ? "bg-brand-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Personal Details ─────────────────────────────
function PersonalDetailsStep({
  onNext,
}: {
  onNext: (data: {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: string;

  // Affordability details
  rentExpense: number;
  foodExpense: number;
  utilitiesExpense: number;
  transportExpense: number;
  otherHouseholdExpense: number;
  otherCreditPayments: number;
}) => void;
}) {
  const [form, setForm] = useState({
  fullName: "",
  phone: "",
  pan: "",
  dateOfBirth: "",
  monthlySalary: "",
  employmentMode: "salaried",

  // Monthly household expenses
  rentExpense: "",
  foodExpense: "",
  utilitiesExpense: "",
  transportExpense: "",
  otherHouseholdExpense: "",

  // Existing loan/credit repayments
  otherCreditPayments: "",
});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Load name and phone from registration record
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await borrowerApi.getProfile();

        const user = res.data?.data?.user;

        if (user) {
          setForm((prev) => ({
            ...prev,
            fullName: user.name || "",
            phone: user.phone || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load borrower profile:", err);
        toast.error("Failed to load your registration details.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const salary = parseFloat(form.monthlySalary);

    const input = {
  fullName: form.fullName,
  pan: form.pan,
  dateOfBirth: form.dateOfBirth,
  monthlySalary: salary,
  employmentMode: form.employmentMode,

  // Monthly household expenses
  rentExpense: Number(form.rentExpense) || 0,
  foodExpense: Number(form.foodExpense) || 0,
  utilitiesExpense: Number(form.utilitiesExpense) || 0,
  transportExpense: Number(form.transportExpense) || 0,
  otherHouseholdExpense: Number(form.otherHouseholdExpense) || 0,

  // Existing credit/loan repayments
  otherCreditPayments: Number(form.otherCreditPayments) || 0,
};

    // Client-side BRE check
    const bre = runClientBRE(input);

    if (!bre.passed) {
      setErrors(bre.errors);
      toast.error("Eligibility check failed. Please review the errors below.");
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await borrowerApi.savePersonalDetails(input);

      toast.success("Personal details saved! ✓");

      onNext(input);
    } catch (err: unknown) {
      const msg =
        (err as {
          response?: {
            data?: {
              message?: string;
            };
          };
        })?.response?.data?.message ||
        "Failed to save details. Try again.";

      toast.error(msg);

      const serverErrors = (
        err as {
          response?: {
            data?: {
              errors?: Record<string, string>;
            };
          };
        }
      )?.response?.data?.errors;

      if (serverErrors) {
        setErrors(serverErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while registration details are being fetched
  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 mt-3">
            Loading your registration details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-slate-900">
          Personal Details
        </h2>

        <p className="text-slate-500 mt-1">
          We&apos;ll verify your eligibility based on this information
        </p>
      </div>

      {/* BRE Rules info */}
      <div className="mb-6 p-4 bg-brand-50 border border-brand-100 rounded-xl flex gap-3">
        <AlertCircle
          size={18}
          className="text-brand-500 flex-shrink-0 mt-0.5"
        />

        <div className="text-sm text-brand-700">
          <p className="font-semibold mb-1">
            Eligibility Criteria
          </p>

          <ul className="space-y-0.5 text-brand-600">
            <li>• Age must be between 23 and 50 years</li>
            <li>• Monthly salary must be ₹25,000 or above</li>
            <li>• Valid ID Number must contain 5–10 digits</li>
            <li>• Must be Salaried or Self-Employed</li>
          </ul>
        </div>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Full Name */}
          <div>
            <label className="label">
              Full Name <span className="text-red-500">*</span>
            </label>

            <input
              className="input-field bg-slate-50 cursor-not-allowed"
              type="text"
              value={form.fullName}
              readOnly
              disabled
            />

            <p className="text-xs text-slate-400 mt-1">
              This name was provided during registration.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="label">
              Phone Number <span className="text-red-500">*</span>
            </label>

            <input
              className="input-field bg-slate-50 cursor-not-allowed"
              type="tel"
              value={form.phone}
              readOnly
              disabled
            />

            <p className="text-xs text-slate-400 mt-1">
              This number was provided during registration.
            </p>
          </div>

          {/* ID + DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* ID Number */}
            <div>
              <label className="label">
                ID Number <span className="text-red-500">*</span>
              </label>

              <input
                className={`input-field ${
                  errors.pan
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter ID Number"
                maxLength={10}
                value={form.pan}
                onChange={(e) => {
                  // Allow numbers only
                  const value = e.target.value.replace(/\D/g, "");

                  setForm({
                    ...form,
                    pan: value,
                  });
                }}
              />

              {errors.pan && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.pan}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="label">
                Date of Birth <span className="text-red-500">*</span>
              </label>

              <input
                className={`input-field ${
                  errors.dateOfBirth
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dateOfBirth: e.target.value,
                  })
                }
              />

              {errors.dateOfBirth && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.dateOfBirth}
                </p>
              )}
            </div>
          </div>

          {/* Salary + Employment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Salary */}
            <div>
              <label className="label">
                Monthly Salary (Ksh){" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                className={`input-field ${
                  errors.monthlySalary
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
                type="number"
                placeholder="50000"
                min={0}
                value={form.monthlySalary}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthlySalary: e.target.value,
                  })
                }
              />

              {errors.monthlySalary && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.monthlySalary}
                </p>
              )}
            </div>

            {/* Employment */}
            <div>
              <label className="label">
                Employment Mode{" "}
                <span className="text-red-500">*</span>
              </label>

              <select
                className={`input-field ${
                  errors.employmentMode
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
                value={form.employmentMode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employmentMode: e.target.value,
                  })
                }
              >
                <option value="salaried">
                  Salaried
                </option>

                <option value="self_employed">
                  Self Employed
                </option>

                <option value="unemployed">
                  Unemployed
                </option>
              </select>

              {errors.employmentMode && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.employmentMode}
                </p>
              )}
            </div>
          </div>
          {/* Monthly Household Expenses */}
<div className="pt-5 border-t border-slate-100">
  <div className="mb-5">
    <h3 className="font-semibold text-slate-800">
      Monthly Household Expenses
    </h3>

    <p className="text-sm text-slate-500 mt-1">
      Enter your average monthly expenses. This helps us determine
      how much you can comfortably repay.
    </p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

    {/* Rent */}
    <div>
      <label className="label">
        Rent / House Expense (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="15000"
        value={form.rentExpense}
        onChange={(e) =>
          setForm({
            ...form,
            rentExpense: e.target.value,
          })
        }
      />
    </div>

    {/* Food */}
    <div>
      <label className="label">
        Food & Groceries (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="10000"
        value={form.foodExpense}
        onChange={(e) =>
          setForm({
            ...form,
            foodExpense: e.target.value,
          })
        }
      />
    </div>

    {/* Utilities */}
    <div>
      <label className="label">
        Utilities (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="5000"
        value={form.utilitiesExpense}
        onChange={(e) =>
          setForm({
            ...form,
            utilitiesExpense: e.target.value,
          })
        }
      />

      <p className="text-xs text-slate-400 mt-1">
        Electricity, water, internet, etc.
      </p>
    </div>

    {/* Transport */}
    <div>
      <label className="label">
        Transport (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="5000"
        value={form.transportExpense}
        onChange={(e) =>
          setForm({
            ...form,
            transportExpense: e.target.value,
          })
        }
      />
    </div>

    {/* Other Household Expenses */}
    <div>
      <label className="label">
        Other Household Expenses (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="3000"
        value={form.otherHouseholdExpense}
        onChange={(e) =>
          setForm({
            ...form,
            otherHouseholdExpense: e.target.value,
          })
        }
      />

      <p className="text-xs text-slate-400 mt-1">
        School fees, medical, dependants, etc.
      </p>
    </div>

    {/* Existing Credit Payments */}
    <div>
      <label className="label">
        Existing Loan / Credit Payments (Ksh)
      </label>

      <input
        className="input-field"
        type="number"
        min={0}
        placeholder="5000"
        value={form.otherCreditPayments}
        onChange={(e) =>
          setForm({
            ...form,
            otherCreditPayments: e.target.value,
          })
        }
      />

      <p className="text-xs text-slate-400 mt-1">
        Total monthly payments for existing loans or credit.
      </p>
    </div>

  </div>
</div>

{/* Affordability Summary */}
{Number(form.monthlySalary) > 0 && (
  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm font-semibold text-slate-700">
          Estimated Disposable Income
        </p>

        <p className="text-xs text-slate-400 mt-1">
          Salary minus household expenses and existing credit payments
        </p>
      </div>

      <span
        className={`font-bold text-lg ${
          Number(form.monthlySalary) -
            (
              Number(form.rentExpense) +
              Number(form.foodExpense) +
              Number(form.utilitiesExpense) +
              Number(form.transportExpense) +
              Number(form.otherHouseholdExpense) +
              Number(form.otherCreditPayments)
            ) >
          0
            ? "text-emerald-600"
            : "text-red-600"
        }`}
      >
        {formatCurrency(
          Math.max(
            0,
            Number(form.monthlySalary) -
              (
                Number(form.rentExpense) +
                Number(form.foodExpense) +
                Number(form.utilitiesExpense) +
                Number(form.transportExpense) +
                Number(form.otherHouseholdExpense) +
                Number(form.otherCreditPayments)
              )
          )
        )}
      </span>
    </div>
  </div>
)}

          {/* Continue */}
          <button
            type="submit"
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking eligibility...
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
// ─── Step 2: Upload Salary Slip ───────────────────────────
function SalarySlipStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) {
      toast.error("Only PDF, JPG, or PNG files are allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5 MB");
      return;
    }
    setFile(f);
    if (f.type !== "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file first"); return; }
    setLoading(true);
    try {
      await borrowerApi.uploadSalarySlip(file);
      toast.success("Salary slip uploaded! ✓");
      onNext();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Upload failed. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-slate-900">Upload Salary Slip</h2>
        <p className="text-slate-500 mt-1">Upload your latest salary slip for verification</p>
      </div>

      <div className="card p-8">
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
            ${dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/50"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />

          {file ? (
            <div className="space-y-3">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText size={30} className="text-red-500" />
                </div>
              )}
              <p className="font-semibold text-slate-700">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <X size={12} /> Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto">
                <Upload size={28} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Drop your file here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse</p>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                <span className="px-2 py-1 bg-slate-100 rounded">PDF</span>
                <span className="px-2 py-1 bg-slate-100 rounded">JPG</span>
                <span className="px-2 py-1 bg-slate-100 rounded">PNG</span>
                <span>• Max 5 MB</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onBack} className="btn-secondary flex-1">Back</button>
          <button
            type="button"
            onClick={handleUpload}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            disabled={!file || loading}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
            ) : (
              <>Upload & Continue <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Loan Configuration ──────────────────────────
function LoanConfigStep({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [amount, setAmount] = useState(150000);
  const [tenure, setTenure] = useState(180);
  const [loading, setLoading] = useState(false);

  const { simpleInterest, totalRepayment } = calculateLoan(amount, tenure);
  const [mpesaPopup, setMpesaPopup] = useState(false);
const [loanId, setLoanId] = useState("");
const [phone, setPhone] = useState("");
const [mpesaLoading, setMpesaLoading] = useState(false);

  const handleApply = async () => {
  setLoading(true);

  try {
    const response =
      await borrowerApi.applyLoan({
        amount,
        tenure,
      });

    const data = response.data.data;

    setLoanId(data.loanId);
    setPhone(data.phone);

    setMpesaPopup(true);

    toast.success(
      "Loan application created successfully."
    );
  } catch (err: unknown) {
    const msg =
      (
        err as {
          response?: {
            data?: {
              message?: string;
            };
          };
        }
      )?.response?.data?.message ||
      "Application failed. Try again.";

    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold text-slate-900">Configure Your Loan</h2>
        <p className="text-slate-500 mt-1">Adjust the sliders to customize your loan terms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sliders */}
        <div className="lg:col-span-3 card p-8 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="text-brand-600 font-semibold text-sm">KSh</span> Loan Amount
              </label>
              <span className="font-bold text-brand-700 text-lg font-mono">{formatCurrency(amount)}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={500000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>Ksh. 1K</span>
              <span>Ksh. 500k</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="font-semibold text-slate-700 flex items-center gap-2">
                <Clock size={16} className="text-brand-600" /> Tenure
              </label>
              <span className="font-bold text-brand-700 text-lg font-mono">{tenure} days</span>
            </div>
            <input
              type="range"
              min={14}
              max={365}
              step={1}
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>14 days</span>
              <span>365 days</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp size={14} className="text-brand-500" />
              <span>Fixed interest rate: <span className="font-semibold text-slate-700">14% p.a. as Per Central Bank of Kenya</span></span>
            </div>
          </div>
        </div>

        {/* Live Summary */}
        <div className="lg:col-span-2 space-y-4">
  <div className="card p-6 bg-brand-950 text-white border-0">
    <p className="text-brand-300 text-sm font-medium mb-4">
      Live Calculation
    </p>

    <div className="space-y-3">

      {/* Principal */}
      <div className="flex justify-between items-center">
        <span className="text-brand-300 text-sm">
          Principal
        </span>

        <span className="font-bold font-mono">
          {formatCurrency(amount)}
        </span>
      </div>

      {/* Tenure */}
      <div className="flex justify-between items-center">
        <span className="text-brand-300 text-sm">
          Tenure
        </span>

        <span className="font-bold">
          {tenure} days
        </span>
      </div>

      {mpesaPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

      <div className="text-center">

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl">📱</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900">
          Confirm your M-Pesa number
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          We will send a KSh 1 confirmation request
          to the following number:
        </p>

        <div className="my-5 rounded-xl bg-slate-100 p-4">
          <p className="text-lg font-bold text-slate-900">
            {phone}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          When you click confirm, an M-Pesa prompt
          will appear on your phone. Enter your
          M-Pesa PIN there to complete verification.
        </p>

        <button
          type="button"
          disabled={mpesaLoading}
          onClick={async () => {
            setMpesaLoading(true);

            try {
              await borrowerApi.initiateMpesaConfirmation(
                loanId,
                phone
              );

              toast.success(
                "M-Pesa prompt sent to your phone."
              );

              setMpesaPopup(false);

              onComplete();
            } catch (err: unknown) {
              const msg =
                (
                  err as {
                    response?: {
                      data?: {
                        message?: string;
                      };
                    };
                  }
                )?.response?.data?.message ||
                "Failed to send M-Pesa prompt.";

              toast.error(msg);
            } finally {
              setMpesaLoading(false);
            }
          }}
          className="mt-6 w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {mpesaLoading
            ? "Sending M-Pesa Prompt..."
            : "Confirm Number"}
        </button>

        <button
          type="button"
          onClick={() => setMpesaPopup(false)}
          className="mt-3 w-full py-2 text-sm text-slate-500"
        >
          Cancel
        </button>

      </div>
    </div>
  </div>
)}

      {/* Interest Rate */}
      <div className="flex justify-between items-center">
        <span className="text-brand-300 text-sm">
          Interest Rate
        </span>

        <span className="font-bold">
          10% / week
        </span>
      </div>

      {/* Simple Interest */}
      <div className="border-t border-brand-800 pt-3 flex justify-between items-center">
        <span className="text-brand-300 text-sm">
          Simple Interest
        </span>

        <span className="font-bold font-mono text-amber-300">
          {formatCurrency(simpleInterest)}
        </span>
      </div>

      {/* Total Repayment */}
      <div className="flex justify-between items-center">
        <span className="text-brand-200 font-semibold">
          Total Repayment
        </span>

        <span className="text-xl font-bold font-mono text-white">
          {formatCurrency(totalRepayment)}
        </span>
      </div>

    </div>
  </div>

          <div className="card p-4 bg-emerald-50 border-emerald-100">
            <div className="flex gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-700">Eligible to Apply</p>
                <p className="text-emerald-600 text-xs mt-0.5">Your profile passed all eligibility checks.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onBack} className="btn-secondary px-8">Back</button>
        <button
          type="button"
          onClick={handleApply}
          className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
          ) : (
            <>Submit Application 🚀</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function BorrowerPage() {
  const [step, setStep] = useState(1);
  const [existingLoan, setExistingLoan] = useState<Loan | null>(null);
  const [checking, setChecking] = useState(true);

  const checkExistingLoan = useCallback(async () => {
    try {
      const res = await borrowerApi.getMyLoan();
      if (res.data.data) {
        setExistingLoan(res.data.data.loan || res.data.data);
      }
    } catch {
      // No loan yet — show form
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkExistingLoan(); }, [checkExistingLoan]);

  if (checking) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (existingLoan) {
    return <LoanStatusCard loan={existingLoan} />;
  }

  return (
    <div>
      <StepIndicator current={step} />
      {step === 1 && (
        <PersonalDetailsStep onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <SalarySlipStep onNext={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <LoanConfigStep
          onBack={() => setStep(2)}
          onComplete={() => checkExistingLoan()}
        />
      )}
    </div>
  );
}
