import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Loan from '../models/Loan';
import Payment from '../models/Payment';

const router = Router();
router.use(authenticate, authorize('admin', 'collection'));

// GET /api/collection/loans
router.get('/loans', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '10'));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find({ status: { $in: ['disbursed', 'closed'] } })
        .populate('borrowerId', 'name email')
        .sort({ disbursedAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments({ status: { $in: ['disbursed', 'closed'] } }),
    ]);

    const loansData = await Promise.all(
      loans.map(async (loan) => {
        const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string };
        const payments = await Payment.find({ loanId: loan._id }).sort({ paymentDate: -1 });
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          _id: loan._id,
          borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
          status: loan.status,
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          totalPaid,
          outstanding: Math.max(0, loan.totalRepayment - totalPaid),
          payments,
          disbursedAt: loan.disbursedAt,
          closedAt: loan.closedAt,
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt,
        };
      })
    );

    res.status(200).json({ success: true, data: { data: loansData, total, page, limit } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
  }
});

// POST /api/collection/loans/:id/payment
// Frontend sends: { utrNumber, amount, date }
router.post(
  '/loans/:id/payment',
  [
    body('utrNumber').notEmpty().trim().isLength({ min: 6, max: 50 }),
    body('amount').isFloat({ min: 1 }),
    body('date').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    // Support both 'date' (frontend) and 'paymentDate' field names
    const { utrNumber, amount, date, paymentDate } = req.body;

    try {
      const loan = await Loan.findById(req.params.id);
      if (!loan) { res.status(404).json({ success: false, message: 'Loan not found.' }); return; }
      if (loan.status !== 'disbursed') {
        res.status(400).json({ success: false, message: `Cannot record payment. Loan status: ${loan.status}` });
        return;
      }

      // Check UTR uniqueness
      const existing = await Payment.findOne({ utrNumber: utrNumber.toUpperCase() });
      if (existing) {
        res.status(409).json({ success: false, message: 'UTR number already exists.' });
        return;
      }

      // Calculate outstanding
      const allPayments = await Payment.find({ loanId: loan._id });
      const totalPaidSoFar = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = loan.totalRepayment - totalPaidSoFar;

      if (outstanding <= 0) {
        res.status(400).json({ success: false, message: 'Loan already fully paid.' });
        return;
      }
      if (Number(amount) > outstanding) {
        res.status(400).json({ success: false, message: `Amount exceeds outstanding balance of ₹${outstanding.toLocaleString('en-IN')}` });
        return;
      }

      const payment = await Payment.create({
        loanId: loan._id,
        borrowerId: loan.borrowerId,
        utrNumber: utrNumber.toUpperCase(),
        amount: Number(amount),
        paymentDate: (date || paymentDate) ? new Date(date || paymentDate) : new Date(),
        recordedBy: req.user!.userId,
      });

      const newTotalPaid = totalPaidSoFar + Number(amount);
      const newOutstanding = Math.max(0, loan.totalRepayment - newTotalPaid);
      let loanClosed = false;

      if (newOutstanding === 0) {
        loan.status = 'closed';
        loan.closedAt = new Date();
        await loan.save();
        loanClosed = true;
      }

      res.status(201).json({
        success: true,
        message: loanClosed ? 'Payment recorded. Loan is now CLOSED.' : 'Payment recorded.',
        data: {
          payment: { id: payment._id, utrNumber: payment.utrNumber, amount: payment.amount, paymentDate: payment.paymentDate },
          loanSummary: { totalRepayment: loan.totalRepayment, totalPaid: newTotalPaid, outstanding: newOutstanding, loanStatus: loanClosed ? 'closed' : 'disbursed' },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(409).json({ success: false, message: 'UTR number already exists.' });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to record payment.' });
    }
  }
);

export default router;
