"use client";
// src/app/auth/login/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, TrendingUp, Lock, Mail, ArrowRight, Users, DollarSign, Clock } from "lucide-react";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(user.role === "borrower" ? "/borrower" : "/dashboard");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Login failed. Check your credentials.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
            <TrendingUp size={24} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
            LoanFlow
          </span>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <h1 className="font-display text-6xl leading-tight bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent drop-shadow-2xl">
            Smarter lending,<br />
            <span className="text-white">simplified.</span>
          </h1>
          <p className="text-indigo-100 text-xl leading-relaxed opacity-90">
            Apply for loans in minutes. Track your application in real-time. 
            Get funds disbursed fast.
          </p>
          
          {/* Modern Stats Cards */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            {[
              { label: "Active Loans", value: "12,400+", icon: Users },
              { label: "Disbursed", value: "₹84 Cr+", icon: DollarSign },
              { label: "Avg. Approval", value: "24 hrs", icon: Clock },
              { label: "Happy Borrowers", value: "98%", icon: TrendingUp },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.label} 
                  className="group bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-indigo-200 text-sm font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-indigo-200 text-sm opacity-80">
          © 2026 LoanFlow. All rights reserved.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Floating Elements */}
        <div className="absolute top-20 right-10 w-20 h-20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl animate-float" />
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-gradient-to-r from-pink-500/10 to-indigo-500/10 rounded-full blur-xl animate-float delay-300" />

        <div className="w-full max-w-md relative z-10 animate-fade-up">
          {/* Logo Mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10 pb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
              LoanFlow
            </span>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 hover:shadow-3xl transition-all duration-500">
            <h2 className="font-display text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-3">
              Welcome back
            </h2>
            <p className="text-slate-600 text-lg mb-10 leading-relaxed">
              Enter your credentials to continue to your dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-wide uppercase">
                  Email Address
                </label>
                <div className="group relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    className="w-full h-14 pl-12 pr-4 text-lg border-2 border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-wide uppercase">
                  Password
                </label>
                <div className="group relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    className="w-full h-14 pl-12 pr-14 text-lg border-2 border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition-all duration-200"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="group w-full h-14 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden relative disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-slate-600 text-sm mt-8">
              New borrower?{" "}
              <Link href="/auth/register" className="font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent hover:underline transition-all">
                Create account
              </Link>
            </p>

            {/* Demo Credentials - Glass Effect */}
            <div className="mt-10 p-6 bg-gradient-to-b from-white/60 to-white/30 backdrop-blur-xl rounded-2xl border border-white/40 shadow-xl">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                🎯 Demo Credentials
              </p>
              <div className="space-y-2">
                {[
                  { role: "Borrower", email: "borrower@lms.com" },
                  { role: "Sales", email: "sales@lms.com" },
                  { role: "Sanction", email: "sanction@lms.com" },
                  { role: "Disbursement", email: "disbursement@lms.com" },
                  { role: "Collection", email: "collection@lms.com" },
                  { role: "Admin", email: "admin@lms.com" },
                ].map((cred) => (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => setForm({ email: cred.email, password: "Password@123" })}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-purple-500/10 border border-white/30 hover:border-indigo-200 transition-all duration-300 group flex items-center justify-between hover:shadow-md"
                  >
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-700">{cred.role}</span>
                    <span className="text-xs text-indigo-500 font-mono bg-indigo-50/50 px-2 py-1 rounded-lg group-hover:bg-indigo-100">
                      {cred.email}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center font-mono bg-slate-100/50 px-3 py-1.5 rounded-lg">
                Password: <span className="font-bold text-indigo-600">Password@123</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-up {
          animation: fadeUp 0.6s ease-out;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
