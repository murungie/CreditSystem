"use client";
// src/app/dashboard/page.tsx
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const roleRoutes: Record<string, string> = {
      admin: "/dashboard/sales",
      sales: "/dashboard/sales",
      sanction: "/dashboard/sanction",
      disbursement: "/dashboard/disbursement",
      collection: "/dashboard/collection",
    };
    const route = roleRoutes[user.role];
    if (route) router.replace(route);
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}
