import crypto from "crypto";
import nodemailer from "nodemailer";
import { config } from "../config.js";

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function isBrevoConfigured() {
  return Boolean(config.brevoApiKey && config.brevoApiUrl && config.otpFromEmail);
}

function isSmtpConfigured() {
  return Boolean(
    config.smtpEnabled &&
      config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.otpFromEmail
  );
}

async function sendBrevoOtp({ email, otp }) {
  const response = await fetch(config.brevoApiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": config.brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: config.otpFromName,
        email: config.otpFromEmail,
      },
      to: [
        {
          email,
        },
      ],
      subject: "Your PulseChat verification code",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h2 style="margin-bottom: 12px;">PulseChat verification</h2>
          <p style="margin-bottom: 12px;">Use this code to continue signing in:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 18px 0;">
            ${otp}
          </div>
          <p style="margin-top: 12px;">This code expires in ${config.otpTtlMinutes} minutes.</p>
        </div>
      `,
    }),
  });

  if (response.ok) {
    return;
  }

  let errorMessage = `Brevo API request failed with status ${response.status}.`;

  try {
    const payload = await response.json();
    const details =
      payload?.message ??
      payload?.code ??
      payload?.errors?.[0]?.message ??
      payload?.errors?.[0]?.code;

    if (details) {
      errorMessage = `Brevo API request failed: ${details}`;
    }
  } catch {
    try {
      const text = await response.text();
      if (text) {
        errorMessage = `Brevo API request failed: ${text}`;
      }
    } catch {
      // Keep the default error message.
    }
  }

  throw new Error(errorMessage);
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

  if (isBrevoConfigured()) {
    await sendBrevoOtp({ email, otp });

    return {
      message: `Verification code sent to ${email}.`,
      devOtp: null,
      provider: "brevo",
    };
  }

  if (isSmtpConfigured()) {
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
  if (isBrevoConfigured()) {
    return "brevo";
  }

  if (isSmtpConfigured()) {
    return "nodemailer";
  }

  return "local";
}
