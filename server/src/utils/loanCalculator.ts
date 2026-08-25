export function calculateLoan(principal: number, tenureDays: number) {
  const rate = 5; // 10% per week

  const weeks = tenureDays / 7;
  const simpleInterest = principal * (rate / 100) * weeks;
  const totalRepayment = principal + simpleInterest;

  return {
    principal,
    tenure: tenureDays,
    interestRate: rate,
    interestPeriod: "weekly",
    simpleInterest: Math.round(simpleInterest * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
  };
}