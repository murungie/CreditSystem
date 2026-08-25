import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { upload } from '../utils/multerConfig';
import { runBRE } from '../utils/bre';
import { calculateLoan } from '../utils/loanCalculator';
import User from '../models/User';
import Loan from '../models/Loan';
import DocumentModel from '../models/Document';
import Payment from '../models/Payment';

const router = Router();
router.use(authenticate, authorize('borrower'));

// POST /api/borrower/personal-details
router.post(
  '/personal-details',
  [
    body('pan')
      .notEmpty()
      .withMessage('ID Number is required')
      .isNumeric()
      .withMessage('ID Number must contain numbers only')
      .isLength({ min: 5, max: 10 })
      .withMessage('ID Number must be between 5 and 10 digits'),

    body('dateOfBirth')
      .notEmpty()
      .isISO8601()
      .withMessage('Invalid date'),

    body('monthlySalary')
      .isFloat({ min: 0 })
      .withMessage('Salary required'),

    body('employmentMode')
      .isIn([
        'salaried',
        'self-employed',
        'unemployed',
        'self_employed',
      ])
      .withMessage('Invalid employment mode'),

    // Affordability fields
    body('rentExpense')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Rent expense must be a valid positive number'),

    body('foodExpense')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Food expense must be a valid positive number'),

    body('utilitiesExpense')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Utilities expense must be a valid positive number'),

    body('transportExpense')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Transport expense must be a valid positive number'),

    body('otherHouseholdExpense')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Other household expense must be a valid positive number'),

    body('otherCreditPayments')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Other credit payments must be a valid positive number'),
  ],

  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const pan = String(req.body.pan || '').trim();

    const dob = new Date(
      req.body.dateOfBirth || req.body.dob
    );

    const monthlySalary = Number(req.body.monthlySalary);

    // Normalize self_employed → self-employed
    const employmentMode = (
      req.body.employmentMode || ''
    ).replace('_', '-') as string;

    const fullName = req.body.fullName || req.body.name;

    // Affordability information
    const rentExpense = Number(req.body.rentExpense || 0);
    const foodExpense = Number(req.body.foodExpense || 0);
    const utilitiesExpense = Number(req.body.utilitiesExpense || 0);
    const transportExpense = Number(req.body.transportExpense || 0);
    const otherHouseholdExpense = Number(
      req.body.otherHouseholdExpense || 0
    );
    const otherCreditPayments = Number(
      req.body.otherCreditPayments || 0
    );

    try {
      // -----------------------------------------
      // EXISTING BRE CHECK
      // -----------------------------------------
      const breResult = runBRE({
        dob,
        monthlySalary,
        pan,
        employmentMode,
      });

      if (!breResult.passed) {
        await User.findByIdAndUpdate(
          req.user!.userId,
          {
            pan,
            dob,
            monthlySalary,
            employmentMode,

            // Save affordability information even if
            // the basic BRE fails
            rentExpense,
            foodExpense,
            utilitiesExpense,
            transportExpense,
            otherHouseholdExpense,
            otherCreditPayments,

            breStatus: 'failed',
            breFailReason: breResult.reason,
            isProfileComplete: false,
          }
        );

        res.status(400).json({
          success: false,
          message: 'Eligibility check failed.',
          data: {
            breStatus: 'failed',
            failedRule: breResult.failedRule,
            reason: breResult.reason,
          },
        });

        return;
      }

      // -----------------------------------------
      // SAVE BORROWER DETAILS
      // -----------------------------------------
      const updateData: Record<string, unknown> = {
        pan,
        dob,
        monthlySalary,
        employmentMode,

        // Affordability information
        rentExpense,
        foodExpense,
        utilitiesExpense,
        transportExpense,
        otherHouseholdExpense,
        otherCreditPayments,

        breStatus: 'passed',
        breFailReason: undefined,
        isProfileComplete: true,
      };

      // Don't overwrite registration name unless
      // a fullName was actually provided.
      if (fullName) {
        updateData.name = fullName;
      }

      await User.findByIdAndUpdate(
        req.user!.userId,
        updateData
      );

      // -----------------------------------------
      // CALCULATE BASIC FINANCIAL POSITION
      // -----------------------------------------
      const totalHouseholdExpenses =
        rentExpense +
        foodExpense +
        utilitiesExpense +
        transportExpense +
        otherHouseholdExpense;

      const disposableIncome =
        monthlySalary -
        totalHouseholdExpenses -
        otherCreditPayments;

      res.status(200).json({
        success: true,
        message: 'Personal details saved. Eligibility check passed.',
        data: {
          breStatus: 'passed',

          affordability: {
            monthlySalary,
            totalHouseholdExpenses,
            otherCreditPayments,
            disposableIncome,
          },
        },
      });
    } catch (err) {
      console.error(
        'personal-details error:',
        err
      );

      res.status(500).json({
        success: false,
        message: 'Failed to save personal details.',
      });
    }
  }
);

// POST /api/borrower/upload-salary-slip
router.post(
  '/upload-salary-slip',
  upload.single('salarySlip'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }

      if (user.breStatus !== 'passed') {
        res.status(400).json({ success: false, message: 'Complete eligibility check first.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      // Remove old salary slip if exists
      await DocumentModel.deleteMany({ borrowerId: req.user!.userId, documentType: 'salary_slip' });

      const document = await DocumentModel.create({
        borrowerId: req.user!.userId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: 'salary_slip',
      });

      res.status(201).json({
        success: true,
        message: 'Salary slip uploaded successfully.',
        data: {
          documentId: document._id,
          fileName: document.originalName,
          fileSize: document.fileSize,
        },
      });
    } catch (err) {
      console.error('upload-salary-slip error:', err);
      res.status(500).json({ success: false, message: 'File upload failed.' });
    }
  }
);

// POST /api/borrower/apply-loan  (also /apply for compatibility)
// POST /api/borrower/apply-loan
// POST /api/borrower/apply
const applyLoanHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("=================================");
    console.log("APPLY LOAN");
    console.log("USER:", req.user);
    console.log("BODY:", req.body);
    console.log("=================================");

    const { amount, tenure } = req.body;

    const amtNum = Number(amount);
    const tenureNum = Number(tenure);

    // -----------------------------------------
    // VALIDATE AMOUNT
    // -----------------------------------------
    if (
      !Number.isFinite(amtNum) ||
      amtNum < 1000 ||
      amtNum > 500000
    ) {
      res.status(400).json({
        success: false,
        message:
          "Loan amount must be between Ksh. 1,000 and Ksh. 500,000",
      });
      return;
    }

    // -----------------------------------------
    // VALIDATE TENURE
    // -----------------------------------------
    if (
      !Number.isFinite(tenureNum) ||
      tenureNum < 14 ||
      tenureNum > 365
    ) {
      res.status(400).json({
        success: false,
        message:
          "Tenure must be between 14 and 365 days",
      });
      return;
    }

    // -----------------------------------------
    // AUTH CHECK
    // -----------------------------------------
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userId = req.user.userId;

    console.log("USER ID:", userId);

    // -----------------------------------------
    // GET USER
    // -----------------------------------------
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    console.log("USER FOUND:", {
      id: user._id,
      name: user.name,
      role: user.role,
      breStatus: user.breStatus,
      profileComplete: user.isProfileComplete,
    });

    // -----------------------------------------
    // CHECK BRE
    // -----------------------------------------
    if (user.breStatus !== "passed") {
      res.status(400).json({
        success: false,
        message:
          "Your eligibility check has not been passed.",
        data: {
          breStatus: user.breStatus,
          reason: user.breFailReason || null,
        },
      });
      return;
    }

    // -----------------------------------------
    // CHECK SALARY SLIP
    // -----------------------------------------
    const salarySlip = await DocumentModel.findOne({
      borrowerId: userId,
      documentType: "salary_slip",
    });

    console.log(
      "SALARY SLIP:",
      salarySlip?._id || "NOT FOUND"
    );

    if (!salarySlip) {
      res.status(400).json({
        success: false,
        message:
          "Please upload your salary slip before applying.",
      });
      return;
    }

    // -----------------------------------------
    // CHECK ACTIVE LOAN
    // -----------------------------------------
    const existingLoan = await Loan.findOne({
      borrowerId: userId,
      status: {
        $in: [
          "applied",
          "sanctioned",
          "disbursed",
        ],
      },
    });

    console.log(
      "EXISTING LOAN:",
      existingLoan?._id || "NONE"
    );

    if (existingLoan) {
      res.status(409).json({
        success: false,
        message:
          "You already have an active loan application.",
      });
      return;
    }

    // -----------------------------------------
    // CALCULATE LOAN
    // -----------------------------------------
    const loanCalc = calculateLoan(
      amtNum,
      tenureNum
    );

    console.log("LOAN CALCULATION:", loanCalc);

    // -----------------------------------------
    // CREATE LOAN
    // -----------------------------------------
    const loan = await Loan.create({
      borrowerId: userId,
      amount: loanCalc.principal,
      tenure: loanCalc.tenure,
      interestRate: loanCalc.interestRate,
      simpleInterest: loanCalc.simpleInterest,
      totalRepayment: loanCalc.totalRepayment,
      status: "applied",
      appliedAt: new Date(),
    });

    console.log("LOAN CREATED:", loan._id);

    // -----------------------------------------
    // LINK SALARY SLIP
    // -----------------------------------------
    await DocumentModel.findByIdAndUpdate(
      salarySlip._id,
      {
        loanId: loan._id,
      }
    );

    console.log("SALARY SLIP LINKED");

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------
    

res.status(201).json({
  success: true,
  message: 'Loan application created successfully.',
  data: {
    loanId: loan._id,
    amount: loan.amount,
    tenure: loan.tenure,
    interestRate: loan.interestRate,
    simpleInterest: loan.simpleInterest,
    totalRepayment: loan.totalRepayment,
    status: loan.status,

    mpesaConfirmationRequired: true,

    phone: user?.phone,
  },
});

  } catch (err: unknown) {
    console.error("=================================");
    console.error("APPLY LOAN ERROR");
    console.error("=================================");

    if (err instanceof Error) {
      console.error("MESSAGE:", err.message);
      console.error("STACK:", err.stack);
    } else {
      console.error(err);
    }

    res.status(500).json({
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Loan application failed.",
    });
  }
};

router.post("/apply-loan", applyLoanHandler);
router.post("/apply", applyLoanHandler);

router.post('/apply-loan', applyLoanHandler);
router.post('/apply', applyLoanHandler);

// GET /api/borrower/my-loan
router.get('/my-loan', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findOne({ borrowerId: req.user!.userId }).sort({ createdAt: -1 });
    if (!loan) {
      res.status(404).json({ success: false, message: 'No loan found.' });
      return;
    }

    const user = await User.findById(req.user!.userId).select('-passwordHash');
    const salarySlip = await DocumentModel.findOne({
      borrowerId: req.user!.userId,
      documentType: 'salary_slip',
    });
    const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: -1 });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, loan.totalRepayment - totalPaid);

    res.status(200).json({
      success: true,
      data: {
        loan: {
          _id: loan._id,
          borrower: user,
          status: loan.status,
          rejectionReason: loan.rejectionReason,
          appliedAt: loan.appliedAt,
          sanctionedAt: loan.sanctionedAt,
          disbursedAt: loan.disbursedAt,
          closedAt: loan.closedAt,
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt,
          personalDetails: user
            ? {
                fullName: user.name,
                pan: user.pan,
                dateOfBirth: user.dob,
                monthlySalary: user.monthlySalary,
                employmentMode: user.employmentMode,
              }
            : null,
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          salarySlipUrl: salarySlip ? `/uploads/${salarySlip.fileName}` : null,
          totalPaid,
          outstanding,
          payments,
        },
      },
    });
  } catch (err) {
    console.error('my-loan error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch loan.' });
  }
});

// GET /api/borrower/calculate
router.get('/calculate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, tenure } = req.query;
  if (!amount || !tenure) {
    res.status(400).json({ success: false, message: 'amount and tenure required.' });
    return;
  }
  const calc = calculateLoan(Number(amount), Number(tenure));
  res.status(200).json({ success: true, data: calc });
});

// GET /api/borrower/profile
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('-passwordHash');
    if (!user) { res.status(404).json({ success: false, message: 'User not found.' }); return; }
    res.status(200).json({ success: true, data: { user } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

export default router;
