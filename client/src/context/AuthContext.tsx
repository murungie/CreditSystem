"use client";

// src/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import Cookies from "js-cookie";
import { User, Role } from "@/types";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    name: string,
    phone: string,
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => void;

  hasRole: (roles: Role[]) => boolean;

  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = Cookies.get("lms_token");
    const savedUser = Cookies.get("lms_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        Cookies.remove("lms_token");
        Cookies.remove("lms_user");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ) => {
    const res = await authApi.login(email, password);
    const { token: t, user: u } = res.data.data;
    Cookies.set("lms_token", t, {
      expires: 7,
    });

    Cookies.set("lms_user", JSON.stringify(u), {
      expires: 7,
    });

    setToken(t);
    setUser(u);
  };

  const register = async (
    name: string,
    phone: string,
    email: string,
    password: string
  ) => {
    const res = await authApi.register(
      name,
      phone,
      email,
      password
    );

    const { token: t, user: u } = res.data.data;

    Cookies.set("lms_token", t, {
      expires: 7,
    });

    Cookies.set("lms_user", JSON.stringify(u), {
      expires: 7,
    });

    setToken(t);
    setUser(u);
  };

  const logout = () => {
    Cookies.remove("lms_token");
    Cookies.remove("lms_user");

    setToken(null);
    setUser(null);

    window.location.href = "/auth/login";
  };

  const hasRole = (roles: Role[]) => {
    if (!user) return false;

    return roles.includes(user.role);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();

      const u = res.data.data.user;

      setUser(u);

      Cookies.set("lms_user", JSON.stringify(u), {
        expires: 7,
      });
    } catch {
      // Ignore — interceptor handles 401
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return ctx;
}