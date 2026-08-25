import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Loan from '../models/Loan';
import User from '../models/User';
import DocumentModel from '../models/Document';

const router = Router();
router.use(authenticate, authorize('admin', 'sanction'));

// GET /api/sanction/loans  — returns applied loans
router.get('/loans', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '10'));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find({ status: 'applied' })
        .populate('borrowerId', 'name email pan dob monthlySalary employmentMode')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments({ status: 'applied' }),
    ]);

    const loansData = await Promise.all(
      loans.map(async (loan) => {
        const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string; pan?: string; dob?: Date; monthlySalary?: number; employmentMode?: string };
        const salarySlip = await DocumentModel.findOne({ borrowerId: borrower._id, documentType: 'salary_slip' });
        return {
          _id: loan._id,
          borrower: { _id: borrower._id, name: borrower.name, email: borrower.email },
          status: loan.status,
          personalDetails: {
            fullName: borrower.name,
            pan: borrower.pan,
            dateOfBirth: borrower.dob,
            monthlySalary: borrower.monthlySalary,
            employmentMode: borrower.employmentMode,
          },
          loanConfig: {
            amount: loan.amount,
            tenure: loan.tenure,
            interestRate: loan.interestRate,
            simpleInterest: loan.simpleInterest,
            totalRepayment: loan.totalRepayment,
          },
          salarySlipUrl: salarySlip ? `/uploads/${salarySlip.fileName}` : null,
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt,
          totalPaid: 0,
          payments: [],
        };
      })
    );

    res.status(200).json({ success: true, data: { data: loansData, total, page, limit } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch loans.' });
  }
});

// PATCH /api/sanction/loans/:id/approve
router.patch('/loans/:id/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) { res.status(404).json({ success: false, message: 'Loan not found.' }); return; }
    if (loan.status !== 'applied') {
      res.status(400).json({ success: false, message: `Loan is already ${loan.status}.` });
      return;
    }
    loan.status = 'sanctioned';
    loan.sanctionedBy = req.user!.userId as unknown as import('mongoose').Types.ObjectId;
    loan.sanctionedAt = new Date();
    await loan.save();
    res.status(200).json({ success: true, message: 'Loan sanctioned.', data: { status: loan.status } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to sanction loan.' });
  }
});

// PATCH /api/sanction/loans/:id/reject
router.patch(
  '/loans/:id/reject',
  [body('reason').notEmpty().withMessage('Rejection reason required')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    try {
      const loan = await Loan.findById(req.params.id);
      if (!loan) { res.status(404).json({ success: false, message: 'Loan not found.' }); return; }
      if (loan.status !== 'applied') {
        res.status(400).json({ success: false, message: `Loan is already ${loan.status}.` });
        return;
      }
      loan.status = 'rejected';
      loan.rejectionReason = req.body.reason;
      await loan.save();
      res.status(200).json({ success: true, message: 'Loan rejected.', data: { status: loan.status } });
    } catch {
      res.status(500).json({ success: false, message: 'Failed to reject loan.' });
    }
  }
);

export default router;
