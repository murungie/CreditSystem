// src/lib/bre.ts
// Business Rule Engine - Client-side pre-validation
//
// IMPORTANT:
// This is only for UX feedback.
// The authoritative BRE runs on the server.
//
// The same rules should be implemented in:
// src/utils/bre.ts

export interface BREInput {
  dateOfBirth: string;
  monthlySalary: number;
  pan: string;
  employmentMode: string;

  // Monthly household expenses
  rentExpense: number;
  foodExpense: number;
  utilitiesExpense: number;
  transportExpense: number;
  otherHouseholdExpense: number;

  // Existing loan / credit commitments
  otherCreditPayments: number;

  // Optional loan information.
  // These are not required during personal-details submission.
  loanAmount?: number;
  loanTenure?: number;
}

export interface BREResult {
  passed: boolean;
  errors: Record<string, string>;

  affordability?: {
    monthlySalary: number;
    totalHouseholdExpenses: number;
    otherCreditPayments: number;
    totalExistingCommitments: number;
    disposableIncome: number;
    minimumRequiredDisposableIncome: number;

    proposedLoanPayment?: number;
    remainingIncomeAfterLoan?: number;
    affordabilityRatio?: number;
  };
}

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

export const BRE_CONFIG = {
  MIN_AGE: 23,
  MAX_AGE: 50,

  MIN_MONTHLY_SALARY: 25_000,

  // Applicant should retain at least 30% of salary
  MIN_REMAINING_INCOME_RATIO: 0.30,

  // Maximum 70% of salary may be committed
  MAX_COMMITMENT_RATIO: 0.70,

  MIN_LOAN_AMOUNT: 1_000,
  MAX_LOAN_AMOUNT: 500_000,

  MIN_TENURE_DAYS: 14,
  MAX_TENURE_DAYS: 365,

  // Your existing calculation uses 5% per week.
  // Change to 10 if 10% per week is actually intended.
  WEEKLY_INTEREST_RATE: 5,
};

const ID_NUMBER_REGEX = /^\d{5,10}$/;

// --------------------------------------------------
// AGE
// --------------------------------------------------

function getAge(dob: string): number {
  const birth = new Date(dob);

  if (isNaN(birth.getTime())) {
    return NaN;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

// --------------------------------------------------
// HOUSEHOLD EXPENSES
// --------------------------------------------------

export function calculateHouseholdExpenses(
  input: BREInput
): number {
  return (
    Number(input.rentExpense || 0) +
    Number(input.foodExpense || 0) +
    Number(input.utilitiesExpense || 0) +
    Number(input.transportExpense || 0) +
    Number(input.otherHouseholdExpense || 0)
  );
}

// --------------------------------------------------
// DISPOSABLE INCOME
// --------------------------------------------------

export function calculateDisposableIncome(
  input: BREInput
): number {
  const householdExpenses =
    calculateHouseholdExpenses(input);

  const existingCreditPayments =
    Number(input.otherCreditPayments || 0);

  return (
    Number(input.monthlySalary || 0) -
    householdExpenses -
    existingCreditPayments
  );
}

// --------------------------------------------------
// LOAN CALCULATION
// --------------------------------------------------

export function calculateLoan(
  principal: number,
  tenureDays: number
) {
  const rate =
    BRE_CONFIG.WEEKLY_INTEREST_RATE;

  const weeks = tenureDays / 7;

  const simpleInterest =
    principal *
    (rate / 100) *
    weeks;

  const totalRepayment =
    principal + simpleInterest;

  return {
    principal,
    tenure: tenureDays,
    interestRate: rate,

    simpleInterest:
      Math.round(
        simpleInterest * 100
      ) / 100,

    totalRepayment:
      Math.round(
        totalRepayment * 100
      ) / 100,
  };
}

// --------------------------------------------------
// MONTHLY LOAN PAYMENT
// --------------------------------------------------
//
// Converts the total repayment into an
// estimated monthly payment.
//
// Example:
// 180 days ≈ 6 months
//
// This allows the affordability engine
// to compare the new loan with monthly income.
//

export function calculateMonthlyLoanPayment(
  principal: number,
  tenureDays: number
): number {
  const loan =
    calculateLoan(
      principal,
      tenureDays
    );

  const months =
    tenureDays / 30;

  if (months <= 0) {
    return 0;
  }

  return loan.totalRepayment / months;
}

// --------------------------------------------------
// MAIN BRE
// --------------------------------------------------

export function runClientBRE(
  input: BREInput
): BREResult {
  const errors: Record<string, string> = {};

  // ------------------------------------------------
  // RULE 1: AGE
  // ------------------------------------------------

  const age =
    getAge(input.dateOfBirth);

  if (
    isNaN(age) ||
    age < BRE_CONFIG.MIN_AGE ||
    age > BRE_CONFIG.MAX_AGE
  ) {
    errors.dateOfBirth =
      `Age must be between ${BRE_CONFIG.MIN_AGE} and ${BRE_CONFIG.MAX_AGE} years ` +
      `(your age: ${
        isNaN(age) ? "invalid" : age
      })`;
  }

  // ------------------------------------------------
  // RULE 2: SALARY
  // ------------------------------------------------

  const salary =
    Number(input.monthlySalary || 0);

  if (
    salary < BRE_CONFIG.MIN_MONTHLY_SALARY
  ) {
    errors.monthlySalary =
      `Monthly salary must be at least ${formatCurrency(
        BRE_CONFIG.MIN_MONTHLY_SALARY
      )}`;
  }

  // ------------------------------------------------
  // RULE 3: ID NUMBER
  // ------------------------------------------------

  if (
    !ID_NUMBER_REGEX.test(
      input.pan?.trim() || ""
    )
  ) {
    errors.pan =
      "ID Number must contain 5 to 10 digits";
  }

  // ------------------------------------------------
  // RULE 4: EMPLOYMENT
  // ------------------------------------------------

  const employmentMode =
    input.employmentMode ===
    "self_employed"
      ? "self-employed"
      : input.employmentMode;

  if (
    employmentMode ===
    "unemployed"
  ) {
    errors.employmentMode =
      "Unemployed applicants are not eligible for loans";
  }

  // ------------------------------------------------
  // AFFORDABILITY
  // ------------------------------------------------

  const totalHouseholdExpenses =
    calculateHouseholdExpenses(input);

  const otherCreditPayments =
    Number(
      input.otherCreditPayments || 0
    );

  const totalExistingCommitments =
    totalHouseholdExpenses +
    otherCreditPayments;

  const disposableIncome =
    salary -
    totalExistingCommitments;

  const minimumRequiredDisposableIncome =
    salary *
    BRE_CONFIG.MIN_REMAINING_INCOME_RATIO;

  // ------------------------------------------------
  // RULE 5:
  // EXISTING COMMITMENTS MUST NOT LEAVE
  // NEGATIVE INCOME
  // ------------------------------------------------

  if (
    disposableIncome < 0
  ) {
    errors.affordability =
      "Your household expenses and existing credit payments exceed your monthly salary.";
  }

  // ------------------------------------------------
  // RULE 6:
  // APPLICANT MUST RETAIN AT LEAST 30%
  // OF SALARY
  // ------------------------------------------------

  else if (
    disposableIncome <
    minimumRequiredDisposableIncome
  ) {
    errors.affordability =
      `Your disposable income is too low. You should retain at least ${formatCurrency(
        minimumRequiredDisposableIncome
      )} after existing monthly commitments.`;
  }

  // ------------------------------------------------
  // LOAN-SPECIFIC AFFORDABILITY
  // ------------------------------------------------

  let proposedLoanPayment:
    number | undefined;

  let remainingIncomeAfterLoan:
    number | undefined;

  let affordabilityRatio:
    number | undefined;

  if (
    input.loanAmount !== undefined &&
    input.loanTenure !== undefined
  ) {
    const loanAmount =
      Number(input.loanAmount);

    const loanTenure =
      Number(input.loanTenure);

    // Loan amount validation
    if (
      loanAmount <
        BRE_CONFIG.MIN_LOAN_AMOUNT ||
      loanAmount >
        BRE_CONFIG.MAX_LOAN_AMOUNT
    ) {
      errors.loanAmount =
        `Loan amount must be between ${formatCurrency(
          BRE_CONFIG.MIN_LOAN_AMOUNT
        )} and ${formatCurrency(
          BRE_CONFIG.MAX_LOAN_AMOUNT
        )}`;
    }

    // Tenure validation
    if (
      loanTenure <
        BRE_CONFIG.MIN_TENURE_DAYS ||
      loanTenure >
        BRE_CONFIG.MAX_TENURE_DAYS
    ) {
      errors.loanTenure =
        `Loan tenure must be between ${BRE_CONFIG.MIN_TENURE_DAYS} and ${BRE_CONFIG.MAX_TENURE_DAYS} days`;
    }

    if (
      loanAmount >=
        BRE_CONFIG.MIN_LOAN_AMOUNT &&
      loanAmount <=
        BRE_CONFIG.MAX_LOAN_AMOUNT &&
      loanTenure >=
        BRE_CONFIG.MIN_TENURE_DAYS &&
      loanTenure <=
        BRE_CONFIG.MAX_TENURE_DAYS
    ) {
      proposedLoanPayment =
        calculateMonthlyLoanPayment(
          loanAmount,
          loanTenure
        );

      remainingIncomeAfterLoan =
        disposableIncome -
        proposedLoanPayment;

      affordabilityRatio =
        salary > 0
          ? (
              (
                totalExistingCommitments +
                proposedLoanPayment
              ) / salary
            ) * 100
          : 100;

      // ------------------------------------------------
      // FINAL AFFORDABILITY RULE
      // ------------------------------------------------
      if (
        remainingIncomeAfterLoan <
        minimumRequiredDisposableIncome
      ) {
        errors.loanAffordability =
          `This loan is not affordable based on your income and existing commitments. ` +
          `Estimated monthly payment is ${formatCurrency(
            proposedLoanPayment
          )}, leaving approximately ${formatCurrency(
            Math.max(
              0,
              remainingIncomeAfterLoan
            )
          )}.`;
      }
    }
  }

  return {
    passed:
      Object.keys(errors).length === 0,

    errors,

    affordability: {
      monthlySalary: salary,

      totalHouseholdExpenses,

      otherCreditPayments,

      totalExistingCommitments,

      disposableIncome,

      minimumRequiredDisposableIncome,

      proposedLoanPayment,

      remainingIncomeAfterLoan,

      affordabilityRatio,
    },
  };
}

// --------------------------------------------------
// CURRENCY
// --------------------------------------------------

export function formatCurrency(
  amount: number
): string {
  return new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}