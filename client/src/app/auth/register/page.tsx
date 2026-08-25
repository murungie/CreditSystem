"use client";
// src/app/auth/register/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Eye,
  EyeOff,
  TrendingUp,
  User,
  Mail,
  Lock,
  Phone,
} from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!form.name.trim()) return "Full name is required";

    if (!form.phone.trim()) return "Phone number is required";

    // Accept Kenyan numbers such as:
    // 0712345678
    // 0112345678
    // +254712345678
    // 254712345678
    const phoneRegex = /^(?:\+254|254|0)(?:7|1)\d{8}$/;

    if (!phoneRegex.test(form.phone.replace(/\s|-/g, ""))) {
      return "Enter a valid Kenyan phone number";
    }

    if (!form.email.includes("@")) return "Enter a valid email";

    if (form.password.length < 8) {
      return "Password must be at least 8 characters";
    }

    if (form.password !== form.confirm) {
      return "Passwords don't match";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validate();

    if (err) {
      toast.error(err);
      return;
    }

    setLoading(true);

    try {
      await register(
        form.name,
        form.phone,
        form.email,
        form.password
      );

      toast.success("Account created! Let's get started.");
      router.replace("/borrower");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Registration failed. Try again.";

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 p-6">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <TrendingUp size={26} />
          </div>

          <h1 className="font-display text-3xl font-bold text-white">
            Create account
          </h1>

          <p className="text-brand-300 mt-2">
            Start your loan application journey
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="label">Full Name</label>

              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-3 text-slate-400"
                />

                <input
                  className="input-field pl-10"
                  type="text"
                  placeholder="Rahul Sharma"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="label">Phone Number</label>

              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3.5 top-3 text-slate-400"
                />

                <input
                  className="input-field pl-10"
                  type="tel"
                  placeholder="0712345678"
                  value={form.phone}
                  maxLength={13}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Example: 0712345678 or +254712345678
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-3 text-slate-400"
                />

                <input
                  className="input-field pl-10"
                  type="email"
                  placeholder="rahul@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-3 text-slate-400"
                />

                <input
                  className="input-field pl-10 pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password</label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-3 text-slate-400"
                />

                <input
                  className="input-field pl-10"
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      confirm: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full py-3 text-base mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-brand-600 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}