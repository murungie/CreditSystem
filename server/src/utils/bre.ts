// src/utils/bre.ts
// Authoritative server-side Business Rule Engine

export interface BREInput {
  dob: Date;
  monthlySalary: number;
  pan: string;
  employmentMode: string;

  // Monthly household expenses
  rentExpense?: number;
  foodExpense?: number;
  utilitiesExpense?: number;
  transportExpense?: number;
  otherHouseholdExpense?: number;

  // Existing loan / credit commitments
  otherCreditPayments?: number;

  // Optional loan information
  loanAmount?: number;
  loanTenure?: number;
}

export interface BREResult {
  passed: boolean;

  failedRule?: string;

  reason?: string;

  affordability: {
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

  // Borrower must retain at least 30%
  MIN_REMAINING_INCOME_RATIO: 0.30,

  // Maximum total monthly commitment = 70%
  MAX_COMMITMENT_RATIO: 0.70,

  MIN_LOAN_AMOUNT: 1_000,
  MAX_LOAN_AMOUNT: 500_000,

  MIN_TENURE_DAYS: 14,
  MAX_TENURE_DAYS: 365,

  // Current system calculation
  WEEKLY_INTEREST_RATE: 5,
};

// --------------------------------------------------
// AGE
// --------------------------------------------------

function getAge(
  dob: Date
): number {
  if (
    !dob ||
    isNaN(dob.getTime())
  ) {
    return NaN;
  }

  const today =
    new Date();

  let age =
    today.getFullYear() -
    dob.getFullYear();

  const month =
    today.getMonth() -
    dob.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
      today.getDate() <
        dob.getDate()
    )
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

  const creditPayments =
    Number(
      input.otherCreditPayments || 0
    );

  return (
    Number(input.monthlySalary || 0) -
    householdExpenses -
    creditPayments
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

  const weeks =
    tenureDays / 7;

  const simpleInterest =
    principal *
    (rate / 100) *
    weeks;

  const totalRepayment =
    principal +
    simpleInterest;

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

  return (
    loan.totalRepayment /
    months
  );
}

// --------------------------------------------------
// MAIN SERVER BRE
// --------------------------------------------------

export function runBRE(
  input: BREInput
): BREResult {
  const fail = (
    failedRule: string,
    reason: string,
    affordability: BREResult["affordability"]
  ): BREResult => ({
    passed: false,
    failedRule,
    reason,
    affordability,
  });

  const salary =
    Number(
      input.monthlySalary || 0
    );

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

  const baseAffordability = {
    monthlySalary: salary,

    totalHouseholdExpenses,

    otherCreditPayments,

    totalExistingCommitments,

    disposableIncome,

    minimumRequiredDisposableIncome,

    proposedLoanPayment:
      undefined,

    remainingIncomeAfterLoan:
      undefined,

    affordabilityRatio:
      undefined,
  };

  // ------------------------------------------------
  // RULE 1: DOB
  // ------------------------------------------------

  const age =
    getAge(input.dob);

  if (
    isNaN(age) ||
    age < BRE_CONFIG.MIN_AGE ||
    age > BRE_CONFIG.MAX_AGE
  ) {
    return fail(
      "AGE_REQUIREMENT",
      `Age must be between ${BRE_CONFIG.MIN_AGE} and ${BRE_CONFIG.MAX_AGE} years.`,
      baseAffordability
    );
  }

  // ------------------------------------------------
  // RULE 2: SALARY
  // ------------------------------------------------

  if (
    salary <
    BRE_CONFIG.MIN_MONTHLY_SALARY
  ) {
    return fail(
      "MINIMUM_SALARY",
      `Monthly salary must be at least Ksh ${BRE_CONFIG.MIN_MONTHLY_SALARY.toLocaleString()}.`,
      baseAffordability
    );
  }

  // ------------------------------------------------
  // RULE 3: ID NUMBER
  // ------------------------------------------------

  const validId =
    /^\d{5,10}$/.test(
      String(input.pan || "").trim()
    );

  if (!validId) {
    return fail(
      "INVALID_ID",
      "ID Number must contain 5 to 10 digits.",
      baseAffordability
    );
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
    return fail(
      "EMPLOYMENT_STATUS",
      "Unemployed applicants are not eligible for loans.",
      baseAffordability
    );
  }

  // ------------------------------------------------
  // RULE 5: EXISTING COMMITMENTS
  // ------------------------------------------------

  if (
    disposableIncome < 0
  ) {
    return fail(
      "NEGATIVE_DISPOSABLE_INCOME",
      "Household expenses and existing credit payments exceed the applicant's monthly salary.",
      baseAffordability
    );
  }

  // ------------------------------------------------
  // RULE 6: MINIMUM DISPOSABLE INCOME
  // ------------------------------------------------

  if (
    disposableIncome <
    minimumRequiredDisposableIncome
  ) {
    return fail(
      "INSUFFICIENT_DISPOSABLE_INCOME",
      `Applicant must retain at least 30% of monthly salary after existing commitments.`,
      baseAffordability
    );
  }

  // ------------------------------------------------
  // FINAL LOAN AFFORDABILITY
  // ------------------------------------------------

  if (
    input.loanAmount !== undefined &&
    input.loanTenure !== undefined
  ) {
    const loanAmount =
      Number(input.loanAmount);

    const loanTenure =
      Number(input.loanTenure);

    // Loan amount
    if (
      loanAmount <
        BRE_CONFIG.MIN_LOAN_AMOUNT ||
      loanAmount >
        BRE_CONFIG.MAX_LOAN_AMOUNT
    ) {
      return fail(
        "LOAN_AMOUNT",
        `Loan amount must be between Ksh ${BRE_CONFIG.MIN_LOAN_AMOUNT.toLocaleString()} and Ksh ${BRE_CONFIG.MAX_LOAN_AMOUNT.toLocaleString()}.`,
        baseAffordability
      );
    }

    // Tenure
    if (
      loanTenure <
        BRE_CONFIG.MIN_TENURE_DAYS ||
      loanTenure >
        BRE_CONFIG.MAX_TENURE_DAYS
    ) {
      return fail(
        "LOAN_TENURE",
        `Loan tenure must be between ${BRE_CONFIG.MIN_TENURE_DAYS} and ${BRE_CONFIG.MAX_TENURE_DAYS} days.`,
        baseAffordability
      );
    }

    const proposedLoanPayment =
      calculateMonthlyLoanPayment(
        loanAmount,
        loanTenure
      );

    const remainingIncomeAfterLoan =
      disposableIncome -
      proposedLoanPayment;

    const affordabilityRatio =
      salary > 0
        ? (
            (
              totalExistingCommitments +
              proposedLoanPayment
            ) / salary
          ) * 100
        : 100;

    const affordability = {
      ...baseAffordability,

      proposedLoanPayment,

      remainingIncomeAfterLoan,

      affordabilityRatio,
    };

    // ----------------------------------------------
    // FINAL RULE
    // ----------------------------------------------

    if (
      remainingIncomeAfterLoan <
      minimumRequiredDisposableIncome
    ) {
      return fail(
        "LOAN_UNAFFORDABLE",
        `The proposed loan is not affordable based on the applicant's income, household expenses and existing credit commitments.`,
        affordability
      );
    }

    return {
      passed: true,
      affordability,
    };
  }

  // ------------------------------------------------
  // PERSONAL DETAILS PASSED
  // ------------------------------------------------

  return {
    passed: true,
    affordability: baseAffordability,
  };
}