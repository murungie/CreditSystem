import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Loan from '../models/Loan';
import DocumentModel from '../models/Document';

const router = Router();
router.use(authenticate, authorize('admin', 'sales'));

// GET /api/sales/leads
router.get('/leads', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(String(_req.query.page || '1'));
    const limit = parseInt(String(_req.query.limit || '10'));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ role: 'borrower' }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments({ role: 'borrower' }),
    ]);

    const leads = await Promise.all(
      users.map(async (user) => {
        const loan = await Loan.findOne({ borrowerId: user._id }).sort({ createdAt: -1 });
        const hasSlip = await DocumentModel.exists({ borrowerId: user._id, documentType: 'salary_slip' });
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          hasPersonalDetails: user.isProfileComplete,
          hasUploadedSlip: !!hasSlip,
          loanStatus: loan?.status || null,
        };
      })
    );

    // Stats
    const allBorrowers = await User.find({ role: 'borrower' });
    const statsData = await Promise.all(
      allBorrowers.map(async (u) => {
        const loan = await Loan.findOne({ borrowerId: u._id });
        const hasSlip = await DocumentModel.exists({ borrowerId: u._id, documentType: 'salary_slip' });
        return { hasDetails: u.isProfileComplete, hasSlip: !!hasSlip, hasLoan: !!loan };
      })
    );
    const stats = {
      total: allBorrowers.length,
      withDetails: statsData.filter(s => s.hasDetails).length,
      withSlip: statsData.filter(s => s.hasSlip).length,
      applied: statsData.filter(s => s.hasLoan).length,
    };

    res.status(200).json({ success: true, data: { data: leads, total, page, limit, stats } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch leads.' });
  }
});

export default router;
