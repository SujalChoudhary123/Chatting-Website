import crypto from "crypto";
import nodemailer from "nodemailer";
import { config } from "../config.js";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function isEmailProviderConfigured() {
  return Boolean(
    config.smtpEnabled &&
      config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.otpFromEmail
  );
}

async function sendEmailOtp({ email, otp }) {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  await transporter.sendMail({
    from: config.otpFromEmail,
    to: email,
    subject: "Your PulseChat verification code",
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827;">
        <h2 style="margin-bottom: 12px;">PulseChat verification</h2>
        <p style="margin-bottom: 12px;">Use this code to continue signing in:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 18px 0;">
          ${otp}
        </div>
        <p style="margin-top: 12px;">This code expires in ${config.otpTtlMinutes} minutes.</p>
      </div>
    `,
  });
}

export async function sendOtp({ email, user }) {
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

  user.otpCodeHash = hashOtp(otp);
  user.otpExpiresAt = otpExpiresAt;
  user.otpRequestedAt = new Date();
  await user.save();

  if (isEmailProviderConfigured()) {
    await sendEmailOtp({ email, otp });

    return {
      message: `Verification code sent to ${email}.`,
      devOtp: null,
      provider: "nodemailer",
    };
  }

  console.log(`OTP for ${email}: ${otp}`);

  return {
    message: `Verification code generated for ${email}. It expires in ${config.otpTtlMinutes} minutes.`,
    devOtp: config.exposeDevOtp ? otp : null,
    provider: "local",
  };
}

export async function verifyOtpCode({ otp, user }) {
  if (!user?.otpCodeHash || !user?.otpExpiresAt) {
    throw new Error("Request a new verification code and try again.");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    throw new Error("Verification code expired. Request a new one.");
  }

  return user.otpCodeHash === hashOtp(otp);
}

export function getOtpMode() {
  return isEmailProviderConfigured() ? "nodemailer" : "local";
}
