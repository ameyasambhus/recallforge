import express from 'express';
import userAuth from '../middleware/userAuth.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../controllers/billing.controller.js';

const billingRouter = express.Router();

billingRouter.post('/razorpay/order', userAuth, createRazorpayOrder);
billingRouter.post('/razorpay/verify', userAuth, verifyRazorpayPayment);

export default billingRouter;
