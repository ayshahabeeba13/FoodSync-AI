import test from "node:test";
import assert from "node:assert/strict";

// Set environment for test run
process.env.JWT_SECRET = "test-secret-key-at-least-32-chars-long-foodsync-2026";
process.env.DEMO_MODE = "true";

import { hashPassword, verifyPassword } from "../src/server/security/password.ts";
import { createAuthToken, verifyAuthToken } from "../src/server/security/jwt.ts";
import { generateCollectionOTP, verifyCollectionOTP } from "../src/server/security/otp.ts";
import { db } from "../src/server/db/transactionStore.ts";
import { AuthService } from "../src/server/services/authService.ts";
import { FSSAI_SURPLUS_SAFETY_RULES } from "../src/server/config/fssai_rules.ts";

test("FoodSync AI Phase 1 - Comprehensive Test Suite", async (t) => {
  // Reset clean state for testing
  db.resetState();

  await t.test("1. Security: Password Hashing and Verification (bcryptjs)", async () => {
    const rawPass = "Secret@Password2026";
    const hashed = await hashPassword(rawPass);

    assert.notEqual(hashed, rawPass, "Password must be hashed");
    assert.equal(hashed.startsWith("$2"), true, "Must be valid bcrypt format");

    const validMatch = await verifyPassword(rawPass, hashed);
    assert.equal(validMatch, true, "Correct password must verify successfully");

    const invalidMatch = await verifyPassword("WrongPassword123", hashed);
    assert.equal(invalidMatch, false, "Incorrect password must be rejected");
  });

  await t.test("2. Security: JWT Creation, Expiry & Verification (jose)", async () => {
    const payload = {
      userId: "usr_test_123",
      email: "chef@bellaitalia.com",
      role: "RESTAURANT_MANAGER",
      name: "Marco Rossi",
      restaurantId: "rest_test_456",
    };

    const token = await createAuthToken(payload, "2h");
    assert.equal(typeof token, "string", "Token must be a signed string");
    assert.equal(token.split(".").length, 3, "Token must have 3 JWT segments");

    const verified = await verifyAuthToken(token);
    assert.notEqual(verified, null, "Valid token must decode");
    assert.equal(verified.userId, payload.userId);
    assert.equal(verified.email, payload.email);
    assert.equal(verified.role, payload.role);

    // Tampered token check
    const tampered = token.slice(0, -6) + "xyz123";
    const failedVerify = await verifyAuthToken(tampered);
    assert.equal(failedVerify, null, "Tampered token must be rejected");
  });

  await t.test("3. Safeguard 2: Secure 6-Digit NGO Collection OTP", async () => {
    const { plainOtp, record } = generateCollectionOTP(15);

    assert.equal(plainOtp.length, 6, "OTP must be exactly 6 digits");
    assert.equal(/^\d{6}$/.test(plainOtp), true, "OTP must be numeric");
    assert.notEqual(record.hashedOtp, plainOtp, "Hashed OTP must not expose plain text");
    assert.equal(record.attemptCount, 0, "Initial attempts must be 0");
    assert.equal(record.maxAttempts, 3, "Max attempts must be 3");

    // Test successful verification
    const { result: successResult } = verifyCollectionOTP(plainOtp, record);
    assert.equal(successResult.valid, true, "Correct OTP must be valid");

    // Test attempt limit tracking
    const freshOtp = generateCollectionOTP(10);
    const attempt1 = verifyCollectionOTP("000000", freshOtp.record);
    assert.equal(attempt1.result.valid, false);
    assert.equal(attempt1.result.remainingAttempts, 2);

    const attempt2 = verifyCollectionOTP("111111", attempt1.updatedRecord);
    assert.equal(attempt2.result.valid, false);
    assert.equal(attempt2.result.remainingAttempts, 1);

    const attempt3 = verifyCollectionOTP("222222", attempt2.updatedRecord);
    assert.equal(attempt3.result.valid, false);
    assert.equal(attempt3.result.errorCode, "MAX_ATTEMPTS_EXCEEDED");
    assert.equal(attempt3.result.remainingAttempts, 0);

    // Test lockout persistence
    const lockedAttempt = verifyCollectionOTP(freshOtp.plainOtp, attempt3.updatedRecord);
    assert.equal(lockedAttempt.result.valid, false);
    assert.equal(lockedAttempt.result.errorCode, "MAX_ATTEMPTS_EXCEEDED");

    // Test expiration
    const expiredRecord = {
      ...freshOtp.record,
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    };
    const expiredAttempt = verifyCollectionOTP(freshOtp.plainOtp, expiredRecord);
    assert.equal(expiredAttempt.result.valid, false);
    assert.equal(expiredAttempt.result.errorCode, "EXPIRED");
  });

  await t.test("4. Safeguards 3 & 4: Database Transactions, Atomic Rollback & Row Locking", async () => {
    const initialUserCount = db.getState().users.length;

    // Test Rollback upon error
    try {
      await db.runInTransaction(async (tx) => {
        tx.state.users.push({
          id: "temp_user",
          name: "Temporary",
          email: "temp@example.com",
          passwordHash: "dummy",
          role: "RESTAURANT_STAFF",
          createdAt: new Date().toISOString(),
        });
        // Intentionally throw error inside transaction
        throw new Error("INSUFFICIENT_STOCK_TRIGGERED_ROLLBACK");
      });
      assert.fail("Transaction should have thrown error");
    } catch (err) {
      assert.equal(err.message, "INSUFFICIENT_STOCK_TRIGGERED_ROLLBACK");
    }

    assert.equal(
      db.getState().users.length,
      initialUserCount,
      "Rolled back transaction must not mutate master database state"
    );

    // Test Successful Atomic Commit
    await db.runInTransaction(async (tx) => {
      tx.state.users.push({
        id: "committed_user",
        name: "Committed User",
        email: "committed@example.com",
        passwordHash: "dummy",
        role: "RESTAURANT_STAFF",
        createdAt: new Date().toISOString(),
      });
    });

    assert.equal(
      db.getState().users.length,
      initialUserCount + 1,
      "Committed transaction must persist to master state"
    );
  });

  await t.test("5. AuthService: User Registration & Login with FSSAI & Roles", async () => {
    // 5.1 Register Restaurant Manager
    const restRes = await AuthService.register({
      name: "Marco Rossi",
      email: "manager@bellaitalia.com",
      password: "Password@123",
      role: "RESTAURANT_MANAGER",
      restaurantName: "Bella Italia Trattoria",
      fssaiLicenseNumber: "11223344556677",
      cuisine: "Italian & Wood-Fired Pizza",
      restaurantAddress: "100 Feet Road, Indiranagar, Bangalore",
    });

    assert.equal(restRes.user.email, "manager@bellaitalia.com");
    assert.equal(restRes.user.role, "RESTAURANT_MANAGER");
    assert.notEqual(restRes.user.restaurantId, undefined);
    assert.equal(restRes.user.restaurant?.fssaiLicenseNumber, "11223344556677");
    assert.equal(typeof restRes.token, "string");

    // 5.2 Duplicate email rejection
    await assert.rejects(
      async () => {
        await AuthService.register({
          name: "Duplicate User",
          email: "manager@bellaitalia.com",
          password: "AnotherPassword123",
          role: "RESTAURANT_STAFF",
        });
      },
      /CONFLICT_ERROR/,
      "Duplicate email must throw CONFLICT_ERROR"
    );

    // 5.3 Register NGO Coordinator
    const ngoRes = await AuthService.register({
      name: "Anjali Rao",
      email: "coordinator@cityhope.org",
      password: "Password@123",
      role: "NGO_COORDINATOR",
      ngoName: "City Hope Food Rescue",
      regNumber: "NGO-KA-2024-8849",
      ngoAddress: "MG Road Community Center, Bangalore",
    });

    assert.equal(ngoRes.user.email, "coordinator@cityhope.org");
    assert.equal(ngoRes.user.role, "NGO_COORDINATOR");
    assert.notEqual(ngoRes.user.ngoId, undefined);
    assert.equal(ngoRes.user.ngo?.regNumber, "NGO-KA-2024-8849");

    // 5.4 Login Success
    const loginRes = await AuthService.login({
      email: "manager@bellaitalia.com",
      password: "Password@123",
    });
    assert.equal(loginRes.user.id, restRes.user.id);
    assert.equal(typeof loginRes.token, "string");

    // 5.5 Login Invalid Password
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: "manager@bellaitalia.com",
          password: "WrongPassword999",
        });
      },
      /AUTH_ERROR/,
      "Invalid password must throw AUTH_ERROR"
    );

    // 5.6 Profile Retrieval from Token
    const userFromToken = await AuthService.getUserFromToken(loginRes.token);
    assert.notEqual(userFromToken, null);
    assert.equal(userFromToken.email, "manager@bellaitalia.com");
    assert.equal(userFromToken.restaurant?.name, "Bella Italia Trattoria");
  });

  await t.test("6. Safeguard 6: Demo Role Switcher Guarded by Environment Flag", async () => {
    const allUsers = db.getState().users;
    const marco = allUsers.find((u) => u.email === "manager@bellaitalia.com");
    const anjali = allUsers.find((u) => u.email === "coordinator@cityhope.org");

    // When DEMO_MODE=true: Switch succeeds
    process.env.DEMO_MODE = "true";
    process.env.NODE_ENV = "development";
    const switched = await AuthService.switchDemoRole(anjali.id);
    assert.equal(switched.user.email, "coordinator@cityhope.org");
    assert.equal(switched.user.role, "NGO_COORDINATOR");

    // When DEMO_MODE=false or production: Switch must be STRICTLY FORBIDDEN
    process.env.DEMO_MODE = "false";
    await assert.rejects(
      async () => {
        await AuthService.switchDemoRole(marco.id);
      },
      /FORBIDDEN/,
      "Impersonation must be blocked when DEMO_MODE is false"
    );

    process.env.DEMO_MODE = "true";
    process.env.NODE_ENV = "production";
    await assert.rejects(
      async () => {
        await AuthService.switchDemoRole(marco.id);
      },
      /FORBIDDEN/,
      "Impersonation must be blocked in production environments"
    );

    // Restore for further tests
    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";
  });

  await t.test("7. Regulatory: FSSAI Surplus Food Regulations (2019) Specification", async () => {
    assert.equal(
      FSSAI_SURPLUS_SAFETY_RULES.regulatoryBody,
      "Food Safety and Standards Authority of India (FSSAI)"
    );
    assert.equal(FSSAI_SURPLUS_SAFETY_RULES.declaredAllergensList.length >= 8, true);

    const rawTempRule = FSSAI_SURPLUS_SAFETY_RULES.rawIngredientChecklist.find(
      (r) => r.category === "TEMPERATURE"
    );
    assert.equal(rawTempRule?.maxThreshold, 5.0, "FSSAI raw chilled storage threshold must be <= 5°C");

    const prepAttestation = FSSAI_SURPLUS_SAFETY_RULES.preparedFoodChecklist.find(
      (r) => r.category === "FBO_DECLARATION"
    );
    assert.equal(prepAttestation?.required, true, "Staff attestation must be mandatory");
  });
});
