import pool from '../config/postgres.js';
import transactionModel from '../models/transactionModel.js';
import { activatePaidPlan } from './subscription.service.js';
import type { PlanName } from './subscription.service.js';

export const billingService = {
  async createPendingTransaction(data: {
    userId: string | number;
    razorpayOrderId: string;
    plan: Exclude<PlanName, 'free'>;
    amount: number;
  }) {
    return await transactionModel.createPending(data);
  },

  async findTransactionByOrderId(razorpayOrderId: string) {
    return await transactionModel.findByOrderId(razorpayOrderId);
  },

  async markTransactionFailed(razorpayOrderId: string, razorpayPaymentId?: string | null) {
    await transactionModel.markFailed(razorpayOrderId, razorpayPaymentId);
  },

  async fulfillOrder(
    razorpayOrderId: string,
    razorpayPaymentId: string | null,
    userId: number | string,
    plan: Exclude<PlanName, 'free'>
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activatePaidPlan(userId, plan, client);
      await client.query(
        `UPDATE transactions
         SET status = 'success', razorpay_payment_id = COALESCE($1, razorpay_payment_id)
         WHERE razorpay_order_id = $2`,
        [razorpayPaymentId, razorpayOrderId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
