import bcrypt from 'bcryptjs';
import userModel from '../models/userModel.js';
import userSettingsModel from '../models/userSettingsModel.js';
import transporter from '../config/nodemailer.js';
import dotenv from 'dotenv';
dotenv.config();

export const registerService = {
  async getExistingUser(email: string) {
    return await userModel.findOne({ email: email.toLowerCase() });
  },

  async registerFunc(name: string, email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({ name, email, password: hashedPassword });
    await userSettingsModel.createDefault(user.id);
    return { userId: user.id };
  },
};

export const loginService = {
  async getUser(email: string) {
    return await userModel.findOne({ email: email.toLowerCase() });
  },
};

export const verifyService = {
  async getUser(email: string) {
    return await userModel.findOne({ email: email.toLowerCase() });
  },

  async sendOTP(user: any) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expireAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await userModel.update(user.id, {
      verify_otp: otp,
      verify_otp_expire_at: expireAt,
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Verify your email',
      text: `Your verification code is: ${otp} \n\nBest Regards,\nRecallForge Team`,
    };

    console.log('Attempting to send verification email to:', user.email);
    console.log('From:', process.env.SENDER_EMAIL);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✓ Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('✗ Email sending failed:', error);
      throw error;
    }
  },

  async verify(user: any) {
    await userModel.update(user.id, {
      is_account_verified: true,
      verify_otp: '',
      verify_otp_expire_at: 0,
    });
  },

  async deleteUnverifiedUser(userId: number | string) {
    await userModel.deleteById(userId);
  },
};

export const resetService = {
  async getUser(email: string) {
    return await userModel.findOne({ email: email.toLowerCase() });
  },

  async resetOTP(user: any) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expireAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    await userModel.update(user.id, {
      reset_otp: otp,
      reset_otp_expire_at: expireAt,
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Reset your password',
      text: `Your password reset code is: ${otp} \n\nBest Regards,\nRecallForge Team`,
    };

    console.log('Attempting to send password reset email to:', user.email);
    console.log('From:', process.env.SENDER_EMAIL);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✓ Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('✗ Email sending failed:', error);
      throw error;
    }
  },

  async reset(user: any, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.update(user.id, {
      password: hashedPassword,
      reset_otp: '',
      reset_otp_expire_at: 0,
    });
  },
};
