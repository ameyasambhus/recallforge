import bcrypt from "bcryptjs";
import userModel from "../models/userModel";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer";
import dotenv from 'dotenv';
dotenv.config()
export const registerService = {
    async getExistingUser(email: any) {
        return await userModel.findOne({ email });
    },
    async registerFunc(name: any, email: any, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword });
        await user.save();

        // Send welcome email (non-blocking - don't wait for it)
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Welcome to RecallForge",
            text: `Hello ${name},\n\nThank you for registering! Your account has been created using the email: ${email}. Happy Learning!\n\nBest Regards,\nRecallForge Team`,
        };

        // Send email asynchronously without blocking registration
        transporter.sendMail(mailOptions).catch((error) => {
            console.error("Failed to send welcome email:", error);
        });

        return jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
            expiresIn: "7d",
        });
    },

}
export const loginService = {
    async getUser(email: any) {
        return await userModel.findOne({ email });
    }
}
export const verifyService = {
    async getUser(userId: any) {
        return await userModel.findById(userId);
    },
    async sendOTP(user: any) {
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000; //24 hours
        await user.save();
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Verify your email",
            text: `Your verification code is: ${otp} \n\nBest Regards,\nRecallForge Team`,
        };
        await transporter.sendMail(mailOptions);
    },
    async verify(user: any) {
        user.isAccountVerified = true;
        user.verifyOtp = "";
        user.verifyOtpExpireAt = 0;
        await user.save();
    }
}
export const resetService={
    async getUser(email:any){
        return await userModel.findOne({ email });
    },
    async resetOTP(user:any){
        const otp = String(Math.floor(100000 + Math.random() * 900000));
            user.resetOtp = otp;
            user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
            await user.save();
            const mailOptions = {
              from: process.env.SENDER_EMAIL,
              to: user.email,
              subject: "Reset your password",
              text: `Your password reset code is: ${otp} \n\nBest Regards,\nRecallForge Team`,
            };
            await transporter.sendMail(mailOptions);
    },
    async reset(user:any, newPassword:any){
        const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;
    await user.save();
    }
}

