import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Loan from '../models/Loan';
import Payment from '../models/Payment';

const router = Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/overview
router.get('/overview', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalBorrowers, appliedLoans, sanctionedLoans, disbursedLoans, closedLoans, rejectedLoans, allPayments] = await Promise.all([
      User.countDocuments({ role: 'borrower' }),
      Loan.countDocuments({ status: 'applied' }),
      Loan.countDocuments({ status: 'sanctioned' }),
      Loan.countDocuments({ status: 'disbursed' }),
      Loan.countDocuments({ status: 'closed' }),
      Loan.countDocuments({ status: 'rejected' }),
      Payment.find({}),
    ]);

    const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalBorrowers,
        loans: { applied: appliedLoans, sanctioned: sanctionedLoans, disbursed: disbursedLoans, closed: closedLoans, rejected: rejectedLoans },
        totalCollected,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch overview.' });
  }
});

export default router;
