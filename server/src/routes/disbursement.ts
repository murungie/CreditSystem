import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Loan from '../models/Loan';
import DocumentModel from '../models/Document';

const router = Router();
router.use(authenticate, authorize('admin', 'disbursement'));

// GET /api/disbursement/loans — returns sanctioned loans
router.get('/loans', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '10'));
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find({ status: 'sanctioned' })
        .populate('borrowerId', 'name email')
        .sort({ sanctionedAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments({ status: 'sanctioned' }),
    ]);

    const loansData = await Promise.all(
      loans.map(async (loan) => {
        const borrower = loan.borrowerId as unknown as { _id: string; name: string; email: string };
        const salarySlip = await DocumentModel.findOne({ borrowerId: borrower._id });
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

// PATCH /api/disbursement/loans/:id/disburse
router.patch('/loans/:id/disburse', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) { res.status(404).json({ success: false, message: 'Loan not found.' }); return; }
    if (loan.status !== 'sanctioned') {
      res.status(400).json({ success: false, message: `Loan must be sanctioned to disburse. Current: ${loan.status}` });
      return;
    }
    loan.status = 'disbursed';
    loan.disbursedBy = req.user!.userId as unknown as import('mongoose').Types.ObjectId;
    loan.disbursedAt = new Date();
    await loan.save();
    res.status(200).json({ success: true, message: 'Loan disbursed.', data: { status: loan.status, disbursedAt: loan.disbursedAt } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to disburse loan.' });
  }
});

export default router;
