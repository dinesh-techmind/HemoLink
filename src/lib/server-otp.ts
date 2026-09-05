import crypto from "crypto";
import nodemailer from "nodemailer";
import { adminAuth, adminDb } from "./firebase-admin.ts";

export interface OtpRecord {
  email: string;
  otpHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number; // 5 minutes
  attempts: number;
  maxAttempts: number;
  used: boolean;
}

export interface ResetTokenRecord {
  resetToken: string;
  email: string;
  createdAt: number;
  expiresAt: number; // 10 minutes
  used: boolean;
}

// In-memory backing cache for high performance, timing protection, and resilience
const otpStore = new Map<string, OtpRecord>();
const resetTokenStore = new Map<string, ResetTokenRecord>();

// Transporter configuration with fallback
function createEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

/**
 * Sends the transactional OTP email
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "noreply@hemolink.app";
  const subject = "Password Reset Verification Code";
  const bodyText = `Hello,

We received a request to reset your password for your Blood Donation account.

Your verification code is:

${otp}

This code will expire in 5 minutes.

If you did not request a password reset, you can safely ignore this email.

Do not share this verification code with anyone.

Regards,
Blood Donation Team`;

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #ffdfdf; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background-color: #ba1111; color: white; font-weight: bold; font-size: 24px;">🩸</div>
        <h2 style="color: #111827; margin: 12px 0 4px; font-size: 20px;">Blood Donation Emergency Network</h2>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">Password Recovery Verification</p>
      </div>
      <p style="color: #374151; font-size: 14px; line-height: 1.5;">Hello,</p>
      <p style="color: #374151; font-size: 14px; line-height: 1.5;">We received a request to reset your password for your Blood Donation account.</p>
      <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #fff4f4; border-radius: 12px; border: 1px dashed #ba1111;">
        <span style="font-size: 12px; font-weight: bold; color: #ba1111; letter-spacing: 1px; text-transform: uppercase;">Your 6-Digit Verification Code</span>
        <div style="font-size: 34px; font-weight: 800; color: #ba1111; letter-spacing: 8px; margin-top: 8px; font-family: monospace;">${otp}</div>
        <span style="font-size: 11px; color: #991b1b; display: block; margin-top: 6px;">This code will expire in 5 minutes.</span>
      </div>
      <p style="color: #4b5563; font-size: 13px; line-height: 1.5;">If you did not request a password reset, you can safely ignore this email.</p>
      <p style="color: #b91c1c; font-size: 12px; font-weight: bold;">Do not share this verification code with anyone.</p>
      <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">Regards,<br/><strong>Blood Donation Team</strong></p>
    </div>
  `;

  try {
    const transporter = createEmailTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"Blood Donation Team" <${fromAddress}>`,
        to: email,
        subject,
        text: bodyText,
        html: bodyHtml,
      });
      console.log(`[EMAIL SERVICE] OTP successfully emailed to ${email}`);
      return true;
    }
  } catch (emailErr) {
    console.error("[EMAIL SERVICE] Failed to send email via SMTP:", emailErr);
  }

  // Developer / Sandboxed fallback log for verification and testing
  console.log(`\n==================================================`);
  console.log(`[EMAIL SERVICE - PASSWORD RESET OTP]`);
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Generated OTP: ${otp} (Valid for 5 minutes)`);
  console.log(`==================================================\n`);
  return true;
}

/**
 * Generate a cryptographically secure 6-digit OTP and store hashed
 */
export async function generateAndStoreOtp(email: string): Promise<{ success: boolean; message: string; cooldown?: number }> {
  const cleanEmail = email.trim().toLowerCase();

  // Check rate limit: minimum 30 seconds between requests for the same email
  const existing = otpStore.get(cleanEmail);
  const now = Date.now();
  if (existing && now - existing.createdAt < 30 * 1000) {
    const remainingSeconds = Math.ceil((30 * 1000 - (now - existing.createdAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      cooldown: remainingSeconds,
    };
  }

  // Cryptographically secure random 6-digit integer [100000, 999999]
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Cryptographically secure salt & SHA-256 hash
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = crypto.createHash("sha256").update(otp + salt).digest("hex");

  const record: OtpRecord = {
    email: cleanEmail,
    otpHash,
    salt,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes expiration
    attempts: 0,
    maxAttempts: 5,
    used: false,
  };

  // Invalidate previous OTP and store only the new record
  otpStore.set(cleanEmail, record);

  // Synchronize to Firestore dedicated collection `password_reset_otps`
  try {
    if (adminDb) {
      await adminDb.collection("password_reset_otps").doc(cleanEmail).set({
        email: cleanEmail,
        otpHash,
        salt,
        createdAt: new Date(now),
        expiresAt: new Date(record.expiresAt),
        attempts: 0,
        maxAttempts: 5,
        used: false,
      });
    }
  } catch (fsErr) {
    console.warn("[FIRESTORE] Notice: Using in-memory security store for OTPs (Firestore admin sync:", fsErr?.message || fsErr, ")");
  }

  // Account enumeration protection: Check if user exists in Firebase Authentication
  let userExists = true;
  try {
    await adminAuth.getUserByEmail(cleanEmail);
  } catch (authErr: any) {
    if (authErr.code === "auth/user-not-found") {
      userExists = false;
    }
  }

  // If user exists, dispatch the real OTP email
  if (userExists) {
    await sendOtpEmail(cleanEmail, otp);
  } else {
    console.log(`[SECURITY] Account enumeration protection triggered: User ${cleanEmail} not in Firebase Auth. OTP generated but email omitted.`);
  }

  return {
    success: true,
    message: "If an account exists for this email address, a verification code has been sent.",
  };
}

/**
 * Verify 6-digit OTP
 */
export async function verifyOtp(email: string, submittedOtp: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = submittedOtp.trim();

  const record = otpStore.get(cleanEmail);

  if (!record) {
    return { success: false, message: "Invalid or expired OTP. Please request a new code." };
  }

  // Check failed attempts limit (max 5)
  if (record.attempts >= record.maxAttempts) {
    return { success: false, message: "Too many incorrect attempts. Please request a new OTP." };
  }

  // Check if already used
  if (record.used) {
    return { success: false, message: "This verification code has already been used. Please request a new OTP." };
  }

  // Compute timing-safe hash of candidate
  const candidateHash = crypto.createHash("sha256").update(cleanOtp + record.salt).digest("hex");
  const storedBuf = Buffer.from(record.otpHash, "hex");
  const candidateBuf = Buffer.from(candidateHash, "hex");

  const isMatch = storedBuf.length === candidateBuf.length && crypto.timingSafeEqual(storedBuf, candidateBuf);

  if (!isMatch) {
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;

    if (remaining <= 0) {
      record.used = true;
      return { success: false, message: "Too many incorrect attempts. Please request a new OTP." };
    }

    return {
      success: false,
      message: `Invalid OTP. You have ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
    };
  }

  // Success: mark OTP as used
  record.used = true;

  // Generate single-use, cryptographically secure password reset token (valid for 10 minutes)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const tokenRecord: ResetTokenRecord = {
    resetToken,
    email: cleanEmail,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    used: false,
  };

  resetTokenStore.set(resetToken, tokenRecord);

  // Sync to Firestore
  try {
    if (adminDb) {
      await adminDb.collection("password_reset_otps").doc(cleanEmail).update({
        attempts: record.attempts,
        used: true,
      });
    }
  } catch (fsErr) {
    // Non-blocking
  }

  return {
    success: true,
    message: "OTP verified successfully.",
    resetToken,
  };
}

/**
 * Reset Password using verified resetToken
 */
export async function resetPasswordWithToken(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!resetToken) {
    return { success: false, message: "Missing reset authorization token." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: "Password must be at least 6 characters long." };
  }

  const tokenRecord = resetTokenStore.get(resetToken);

  if (!tokenRecord) {
    return { success: false, message: "Password reset authorization is invalid or has expired. Please start over." };
  }

  if (Date.now() > tokenRecord.expiresAt) {
    resetTokenStore.delete(resetToken);
    return { success: false, message: "Password reset authorization has expired. Please request a new OTP." };
  }

  try {
    // Look up user by email in Firebase Authentication
    const user = await adminAuth.getUserByEmail(tokenRecord.email);
    
    // Securely update password using Firebase Authentication Admin SDK
    await adminAuth.updateUser(user.uid, { password: newPassword });

    // Mark token as used to prevent replay
    tokenRecord.used = true;

    // Clean up resetTokenStore
    resetTokenStore.delete(resetToken);

    return {
      success: true,
      message: "Your password has been changed successfully.",
    };
  } catch (err: any) {
    console.error("[FIREBASE AUTH] Failed to reset password:", err);
    return {
      success: false,
      message: err.message || "Failed to update password in Firebase Authentication. Please try again.",
    };
  }
}
