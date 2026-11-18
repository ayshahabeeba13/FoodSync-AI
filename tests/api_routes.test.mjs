import test from "node:test";
import assert from "node:assert/strict";

// Environment setup
process.env.JWT_SECRET = "test-secret-key-at-least-32-chars-long-foodsync-2026";
process.env.DEMO_MODE = "true";

import { GET as healthHandler } from "../src/app/api/v1/health/route.ts";
import { POST as registerHandler } from "../src/app/api/v1/auth/register/route.ts";
import { POST as loginHandler } from "../src/app/api/v1/auth/login/route.ts";
import { GET as meHandler } from "../src/app/api/v1/auth/me/route.ts";
import { POST as switchRoleHandler } from "../src/app/api/v1/auth/switch-role/route.ts";
import { db } from "../src/server/db/transactionStore.ts";

function createMockRequest(url, method = "GET", body = null, headers = {}) {
  return {
    url,
    method,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] || headers[name] || null;
      },
    },
    json: async () => body,
  };
}

test("FoodSync AI Phase 1 - Route Handlers Integration Test Suite", async (t) => {
  db.resetState();

  await t.test("1. Route: GET /api/v1/health", async () => {
    const res = await healthHandler();
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "healthy");
    assert.equal(data.system, "FoodSync AI Engine");
    assert.equal(data.demoMode, true);
  });

  await t.test("2. Route: POST /api/v1/auth/register (Restaurant Manager with FSSAI)", async () => {
    const req = createMockRequest("http://localhost:3000/api/v1/auth/register", "POST", {
      name: "Chef Luigi",
      email: "luigi@trattoria.com",
      password: "Password@123",
      role: "RESTAURANT_MANAGER",
      restaurantName: "Luigi Trattoria",
      fssaiLicenseNumber: "12345678901234",
      cuisine: "Italian",
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.user.email, "luigi@trattoria.com");
    assert.equal(data.user.restaurant.fssaiLicenseNumber, "12345678901234");
    assert.equal(typeof data.token, "string");
  });

  await t.test("3. Route: POST /api/v1/auth/login & GET /api/v1/auth/me", async () => {
    // Login
    const loginReq = createMockRequest("http://localhost:3000/api/v1/auth/login", "POST", {
      email: "luigi@trattoria.com",
      password: "Password@123",
    });
    const loginRes = await loginHandler(loginReq);
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.user.name, "Chef Luigi");

    // Profile via /me
    const meReq = createMockRequest("http://localhost:3000/api/v1/auth/me", "GET", null, {
      authorization: `Bearer ${loginData.token}`,
    });
    const meRes = await meHandler(meReq);
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, "luigi@trattoria.com");
    assert.equal(meData.user.restaurant.name, "Luigi Trattoria");
  });

  await t.test("4. Route: POST /api/v1/auth/switch-role (Safeguard 6)", async () => {
    const user = db.getState().users.find((u) => u.email === "luigi@trattoria.com");
    const switchReq = createMockRequest("http://localhost:3000/api/v1/auth/switch-role", "POST", {
      targetUserId: user.id,
    });
    const switchRes = await switchRoleHandler(switchReq);
    assert.equal(switchRes.status, 200);
    const switchData = await switchRes.json();
    assert.equal(switchData.user.id, user.id);
  });
});
