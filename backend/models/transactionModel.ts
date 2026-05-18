import pool from '../config/postgres.js';
import type { PlanName } from '../services/subscription.service.js';

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Transaction {
  id: number;
  user_id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  plan: PlanName;
  amount: number;
  status: TransactionStatus;
  created_at: Date;
}

const transactionModel = {
  async createPending(data: {
    userId: string | number;
    razorpayOrderId: string;
    plan: Exclude<PlanName, 'free'>;
    amount: number;
  }): Promise<Transaction> {
    const result = await pool.query<Transaction>(
      `INSERT INTO transactions (user_id, razorpay_order_id, plan, amount, status, created_at)
       VALUES ($1, $2, $3, $4, 'pending', NOW())
       RETURNING *`,
      [data.userId, data.razorpayOrderId, data.plan, data.amount]
    );

    return result.rows[0];
  },

  async findByOrderId(razorpayOrderId: string): Promise<Transaction | null> {
    const result = await pool.query<Transaction>(
      'SELECT * FROM transactions WHERE razorpay_order_id = $1 LIMIT 1',
      [razorpayOrderId]
    );

    return result.rows[0] ?? null;
  },

  async markSuccess(razorpayOrderId: string, razorpayPaymentId?: string | null): Promise<void> {
    await pool.query(
      `UPDATE transactions
       SET status = 'success', razorpay_payment_id = COALESCE($1, razorpay_payment_id)
       WHERE razorpay_order_id = $2`,
      [razorpayPaymentId ?? null, razorpayOrderId]
    );
  },

  async markFailed(razorpayOrderId: string, razorpayPaymentId?: string | null): Promise<void> {
    await pool.query(
      `UPDATE transactions
       SET status = 'failed', razorpay_payment_id = COALESCE($1, razorpay_payment_id)
       WHERE razorpay_order_id = $2`,
      [razorpayPaymentId ?? null, razorpayOrderId]
    );
  },
};

export default transactionModel;
