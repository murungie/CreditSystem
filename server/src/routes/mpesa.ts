import { Router, Request, Response } from 'express';
import { initiateSTKPush } from '../services/mpesaService';
import Loan from '../models/Loan';
import User from '../models/User';

const router = Router();

router.post(
  '/stk-push',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        loanId,
        phone,
      } = req.body;

      if (!loanId || !phone) {
        res.status(400).json({
          success: false,
          message: 'Loan ID and phone number are required.',
        });
        return;
      }

      const loan = await Loan.findById(loanId);

      if (!loan) {
        res.status(404).json({
          success: false,
          message: 'Loan not found.',
        });
        return;
      }

      const response = await initiateSTKPush({
        phone,
        amount: 1,
        accountReference: `LOAN-${loan._id}`,
        transactionDesc: 'Loan application verification',
      });

      if (response.ResponseCode !== '0') {
        res.status(400).json({
          success: false,
          message: response.ResponseDescription,
        });
        return;
      }

      await Loan.findByIdAndUpdate(loan._id, {
        mpesaConfirmationStatus: 'pending',
        mpesaCheckoutRequestId: response.CheckoutRequestID,
        mpesaMerchantRequestId: response.MerchantRequestID,
      });

      res.status(200).json({
        success: true,
        message: response.CustomerMessage,
        data: {
          loanId: loan._id,
          checkoutRequestId: response.CheckoutRequestID,
        },
      });
    } catch (error: any) {
  console.error('========== MPESA STK ERROR ==========');
  console.error('Message:', error?.message);
  console.error('Status:', error?.response?.status);
  console.error(
    'Response:',
    JSON.stringify(error?.response?.data, null, 2)
  );
  console.error('=====================================');

  res.status(500).json({
    success: false,
    message:
      error?.response?.data?.errorMessage ||
      error?.response?.data?.ResponseDescription ||
      error?.message ||
      'Failed to initiate M-Pesa confirmation.',
  });
}
  }
);

router.post(
  '/callback',
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log(
        'M-Pesa callback:',
        JSON.stringify(req.body, null, 2)
      );

      const stkCallback =
        req.body?.Body?.stkCallback;

      if (!stkCallback) {
        res.json({
          ResultCode: 0,
          ResultDesc: 'Accepted',
        });
        return;
      }

      const checkoutRequestId =
        stkCallback.CheckoutRequestID;

      const resultCode =
        stkCallback.ResultCode;

      const loan = await Loan.findOne({
        mpesaCheckoutRequestId: checkoutRequestId,
      });

      if (!loan) {
        res.json({
          ResultCode: 0,
          ResultDesc: 'Accepted',
        });
        return;
      }

      // Payment successful
      if (resultCode === 0) {
        const metadata =
          stkCallback.CallbackMetadata?.Item || [];

        const receipt =
          metadata.find(
            (item: any) =>
              item.Name === 'MpesaReceiptNumber'
          )?.Value;

        await Loan.findByIdAndUpdate(loan._id, {
          mpesaConfirmationStatus: 'confirmed',
          mpesaReceiptNumber: receipt,
          mpesaConfirmedAt: new Date(),
        });

        console.log(
          `M-Pesa confirmation successful for loan ${loan._id}`
        );

        // SMS will be sent here
      } else {
        await Loan.findByIdAndUpdate(loan._id, {
          mpesaConfirmationStatus: 'failed',
        });

        console.log(
          `M-Pesa confirmation failed for loan ${loan._id}`
        );
      }

      res.json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      });
    } catch (error) {
      console.error(
        'M-Pesa callback error:',
        error
      );

      res.json({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      });
    }
  }
);

export default router;