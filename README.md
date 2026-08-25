# LoanFlow — Loan Management System

A full-stack Loan Management System built with Next.js, Node.js/Express, TypeScript, MongoDB, and Tailwind CSS.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup

```bash
# Backend — copy and edit
cp .env.example .env
# Set MONGODB_URI, JWT_SECRET

# Frontend — copy and edit
cd ../frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

### 4. Run

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open:https://loan-management-system-seven-ochre.vercel.app/

---

## Demo Login Credentials

| Role         | Email                    | Password     |
|--------------|--------------------------|--------------|
| Borrower     | borrower@lms.com         | Password@123 |
| Sales        | sales@lms.com            | Password@123 |
| Sanction     | sanction@lms.com         | Password@123 |
| Disbursement | disbursement@lms.com     | Password@123 |
| Collection   | collection@lms.com       | Password@123 |
| Admin        | admin@lms.com            | Password@123 |

> Click any role button on the login page to auto-fill credentials.

---

## Architecture

### Backend (`/backend`)
```
src/
├── config/       database.ts
├── middleware/   auth.ts (JWT + RBAC), errorHandler.ts
├── models/       User.ts, Loan.ts, Payment.ts, Document.ts
├── routes/       auth.ts, borrower.ts, sales.ts, sanction.ts,
│                 disbursement.ts, collection.ts, admin.ts
├── utils/        bre.ts (Business Rule Engine), loanCalculator.ts, multerConfig.ts
├── scripts/      seed.ts
├── app.ts
└── index.ts
```

### Frontend (`/frontend`)
```
src/
├── app/
│   ├── auth/login, auth/register
│   ├── borrower/         (Borrower Portal — multi-step application)
│   └── dashboard/        (Operations Dashboard)
│       ├── sales/        (Lead tracking)
│       ├── sanction/     (Approve/reject loans)
│       ├── disbursement/ (Disburse funds)
│       └── collection/   (Record payments)
├── components/
│   ├── ui/RoleGuard.tsx
│   └── dashboard/DataTable.tsx
├── context/AuthContext.tsx
├── lib/api.ts, bre.ts
└── types/index.ts
```

---

## Loan Lifecycle

```
APPLIED → SANCTIONED → DISBURSED → CLOSED
         ↘ REJECTED
```

- **Sales**: Tracks registered borrowers (leads)
- **Sanction**: Reviews applied loans → Approve or Reject
- **Disbursement**: Marks sanctioned loans as disbursed
- **Collection**: Records payments, auto-closes loan when fully paid

---

## Business Rule Engine (BRE)

Runs on server (authoritative) + client (UX feedback):

| Rule       | Condition                    |
|------------|------------------------------|
| Age        | Must be 23–50 years          |
| Salary     | Monthly salary ≥ ₹25,000     |
| PAN        | Format: ABCDE1234F           |
| Employment | Must not be Unemployed       |

---

## Loan Calculation

```
SI = (P × R × T) / (365 × 100)
Total Repayment = P + SI
Interest Rate = 12% p.a. (fixed)
```

---

## API Endpoints

| Method | Path                              | Role            |
|--------|-----------------------------------|-----------------|
| POST   | /api/auth/login                   | Public          |
| POST   | /api/auth/register                | Public          |
| GET    | /api/auth/me                      | Authenticated   |
| POST   | /api/borrower/personal-details    | Borrower        |
| POST   | /api/borrower/upload-salary-slip  | Borrower        |
| POST   | /api/borrower/apply-loan          | Borrower        |
| GET    | /api/borrower/my-loan             | Borrower        |
| GET    | /api/sales/leads                  | Sales, Admin    |
| GET    | /api/sanction/loans               | Sanction, Admin |
| PATCH  | /api/sanction/loans/:id/approve   | Sanction, Admin |
| PATCH  | /api/sanction/loans/:id/reject    | Sanction, Admin |
| GET    | /api/disbursement/loans           | Disbursement, Admin |
| PATCH  | /api/disbursement/loans/:id/disburse | Disbursement, Admin |
| GET    | /api/collection/loans             | Collection, Admin |
| POST   | /api/collection/loans/:id/payment | Collection, Admin |
| GET    | /api/admin/overview               | Admin           |
