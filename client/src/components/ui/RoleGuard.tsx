"use client";
// src/components/ui/RoleGuard.tsx
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import { ShieldX } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShieldX size={48} className="text-red-300" />
        <div className="text-center">
          <h3 className="font-semibold text-slate-700 text-lg">Access Denied</h3>
          <p className="text-slate-500 text-sm mt-1">
            You don&apos;t have permission to access this module.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
