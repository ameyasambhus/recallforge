import crypto from 'node:crypto';
import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { billingService } from '../services/billing.service.js';
import {
  getPaidPlanAmount,
  normalisePlan,
  type PlanName,
  PLAN_PRICES_PAISE,
} from '../services/subscription.service.js';

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are missing');
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function isPaidPlan(plan: PlanName): plan is Exclude<PlanName, 'free'> {
  return plan === 'pro' || plan === 'max';
}

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const requestedPlan = normalisePlan(req.body?.plan);
    if (!isPaidPlan(requestedPlan)) {
      return res.status(400).json({ success: false, error: 'Only PRO and MAX can be purchased.' });
    }

    const userId = req.userId as string;
    const razorpay = getRazorpayClient();

    const amount = getPaidPlanAmount(requestedPlan);
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `rf_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        plan: requestedPlan,
      },
    });

    await billingService.createPendingTransaction({
      userId,
      razorpayOrderId: order.id,
      plan: requestedPlan,
      amount,
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: requestedPlan,
      },
      pricing: PLAN_PRICES_PAISE,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment order',
    });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, error: 'Razorpay key secret is not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const transaction = await billingService.findTransactionByOrderId(razorpay_order_id);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction order not found' });
    }

    if (transaction.status === 'success') {
      return res.status(200).json({ success: true, message: 'Plan already active' });
    }

    const plan = normalisePlan(transaction.plan);
    if (!isPaidPlan(plan)) {
      await billingService.markTransactionFailed(razorpay_order_id, razorpay_payment_id);
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    await billingService.fulfillOrder(razorpay_order_id, razorpay_payment_id, transaction.user_id, plan);

    return res.status(200).json({ success: true, message: 'Plan activated successfully' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
    });
  }
};

function extractOrderAndPaymentFromWebhook(eventPayload: any): {
  orderId: string | null;
  paymentId: string | null;
} {
  const paymentEntity = eventPayload?.payload?.payment?.entity;
  const orderEntity = eventPayload?.payload?.order?.entity;

  const orderId =
    paymentEntity?.order_id ||
    orderEntity?.id ||
    eventPayload?.payload?.payment?.entity?.notes?.order_id ||
    null;

  const paymentId = paymentEntity?.id || null;

  return { orderId, paymentId };
}

function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expectedSignature === signature;
}

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.header('x-razorpay-signature') || undefined;
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : JSON.stringify(req.body ?? {});

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const eventPayload = JSON.parse(rawBody);
    const eventType = eventPayload?.event as string | undefined;
    const { orderId, paymentId } = extractOrderAndPaymentFromWebhook(eventPayload);

    if (!orderId || !eventType) {
      return res.status(200).json({ success: true, received: true });
    }

    if (eventType === 'payment.failed') {
      await billingService.markTransactionFailed(orderId, paymentId);
      return res.status(200).json({ success: true, received: true });
    }

    const isSuccessEvent = eventType === 'payment.captured' || eventType === 'order.paid';

    if (!isSuccessEvent) {
      return res.status(200).json({ success: true, received: true });
    }

    const transaction = await billingService.findTransactionByOrderId(orderId);
    if (!transaction) {
      return res.status(200).json({ success: true, received: true });
    }

    if (transaction.status === 'success') {
      return res.status(200).json({ success: true, received: true });
    }

    const plan = normalisePlan(transaction.plan);
    if (!isPaidPlan(plan)) {
      await billingService.markTransactionFailed(orderId, paymentId);
      return res.status(200).json({ success: true, received: true });
    }

    await billingService.fulfillOrder(orderId, paymentId, transaction.user_id, plan);

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    });
  }
};
