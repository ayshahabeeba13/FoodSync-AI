import crypto from "crypto";

export interface SecureOTPRecord {
  hashedOtp: string;
  salt: string;
  expiresAt: string; // ISO String
  attemptCount: number;
  maxAttempts: number;
}

export interface OTPVerificationResult {
  valid: boolean;
  errorCode?: "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "INVALID_CODE";
  remainingAttempts?: number;
}

const DEFAULT_EXPIRY_MINUTES = 30;
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Generates a 6-digit numeric OTP with cryptographically random salt and SHA-256 hash.
 * Plain-text OTP is returned ONCE for communicating to the recipient, while the hash
 * is safely persisted in the database.
 */
export function generateCollectionOTP(expiryMinutes: number = DEFAULT_EXPIRY_MINUTES): {
  plainOtp: string;
  record: SecureOTPRecord;
} {
  // Generate a true random 6-digit number between 100000 and 999999
  const plainOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString("hex");

  const hashedOtp = hashOtpWithSalt(plainOtp, salt);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  return {
    plainOtp,
    record: {
      hashedOtp,
      salt,
      expiresAt,
      attemptCount: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    },
  };
}

/**
 * Validates the provided OTP against the stored record using constant-time comparison.
 */
export function verifyCollectionOTP(
  submittedOtp: string,
  record: SecureOTPRecord
): { result: OTPVerificationResult; updatedRecord: SecureOTPRecord } {
  const updatedRecord = { ...record };

  // 1. Check expiration
  const now = new Date();
  if (now > new Date(record.expiresAt)) {
    return {
      result: { valid: false, errorCode: "EXPIRED" },
      updatedRecord,
    };
  }

  // 2. Check attempt limits
  if (record.attemptCount >= record.maxAttempts) {
    return {
      result: { valid: false, errorCode: "MAX_ATTEMPTS_EXCEEDED", remainingAttempts: 0 },
      updatedRecord,
    };
  }

  // Increment attempt count on evaluation
  updatedRecord.attemptCount += 1;
  const remaining = Math.max(0, updatedRecord.maxAttempts - updatedRecord.attemptCount);

  // 3. Timing-safe cryptographic comparison
  const submittedHash = hashOtpWithSalt(submittedOtp.trim(), record.salt);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(submittedHash, "utf-8"),
    Buffer.from(record.hashedOtp, "utf-8")
  );

  if (!isValid) {
    return {
      result: {
        valid: false,
        errorCode: remaining === 0 ? "MAX_ATTEMPTS_EXCEEDED" : "INVALID_CODE",
        remainingAttempts: remaining,
      },
      updatedRecord,
    };
  }

  return {
    result: { valid: true },
    updatedRecord,
  };
}

function hashOtpWithSalt(otp: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}
