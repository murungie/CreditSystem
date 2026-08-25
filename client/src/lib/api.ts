// src/lib/api.ts
import axios from "axios";
import Cookies from "js-cookie";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // Important: include credentials (cookies) with cross-origin requests
  withCredentials: false, // we use Authorization header, not cookies on the wire
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get("lms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear and redirect if we're NOT already on the login page
      // to avoid redirect loops
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth")
      ) {
        Cookies.remove("lms_token");
        Cookies.remove("lms_user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────
// ─── Auth ─────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", {
      email: email.toLowerCase().trim(),
      password,
    }),

  register: (
    name: string,
    phone: string,
    email: string,
    password: string
  ) =>
    api.post("/auth/register", {
      name: name.trim(),
      phone: phone.replace(/\s|-/g, ""),
      email: email.toLowerCase().trim(),
      password,
    }),

  me: () => api.get("/auth/me"),
};

// ─── Borrower ──────────────────────────────────────────────
export const borrowerApi = {
  getProfile: () => api.get("/borrower/profile"),
  savePersonalDetails: (data: {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: number;
  employmentMode: string;

  rentExpense: number;
  foodExpense: number;
  utilitiesExpense: number;
  transportExpense: number;
  otherHouseholdExpense: number;
  otherCreditPayments: number;
}) => api.post("/borrower/personal-details", data),

  uploadSalarySlip: (file: File) => {
    const formData = new FormData();
    formData.append("salarySlip", file);
    return api.post("/borrower/upload-salary-slip", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  applyLoan: (data: { amount: number; tenure: number }) =>
    api.post("/borrower/apply-loan", data),
  initiateMpesaConfirmation: (
  loanId: string,
  phone: string
) =>
  api.post("/mpesa/stk-push", {
    loanId,
    phone,
  }),

  getMyLoan: () => api.get("/borrower/my-loan"),

  calculate: (amount: number, tenure: number) =>
    api.get(`/borrower/calculate?amount=${amount}&tenure=${tenure}`),

  
};

// ─── Dashboard ─────────────────────────────────────────────
export const dashboardApi = {
  // Sales
  getLeads: (page = 1, limit = 10) =>
    api.get(`/sales/leads?page=${page}&limit=${limit}`),

  // Sanction
  getAppliedLoans: (page = 1, limit = 10) =>
    api.get(`/sanction/loans?page=${page}&limit=${limit}`),

  sanctionLoan: (loanId: string) =>
    api.patch(`/sanction/loans/${loanId}/approve`),

  rejectLoan: (loanId: string, reason: string) =>
    api.patch(`/sanction/loans/${loanId}/reject`, { reason }),

  // Disbursement
  getSanctionedLoans: (page = 1, limit = 10) =>
    api.get(`/disbursement/loans?page=${page}&limit=${limit}`),

  disburseLoan: (loanId: string) =>
    api.patch(`/disbursement/loans/${loanId}/disburse`),

  // Collection
  getDisbursedLoans: (page = 1, limit = 10) =>
    api.get(`/collection/loans?page=${page}&limit=${limit}`),

  recordPayment: (
    loanId: string,
    data: { utrNumber: string; amount: number; date: string }
  ) => api.post(`/collection/loans/${loanId}/payment`, data),

  // Admin
  getOverview: () => api.get("/admin/overview"),
};
