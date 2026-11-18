import crypto from "crypto";
import { db } from "../db/transactionStore.ts";
import type { User, Restaurant, NGO, UserRole } from "../db/types.ts";
import { hashPassword, verifyPassword } from "../security/password.ts";
import { createAuthToken, verifyAuthToken } from "../security/jwt.ts";
import type { JWTPayload } from "../security/jwt.ts";

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  // Restaurant fields (if registering restaurant manager/staff)
  restaurantName?: string;
  cuisine?: string;
  restaurantAddress?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  fssaiLicenseNumber?: string;
  // NGO fields (if registering NGO coordinator)
  ngoName?: string;
  regNumber?: string;
  ngoAddress?: string;
  contactPerson?: string;
  fssaiSurplusDistributionPermit?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    restaurantId?: string;
    ngoId?: string;
    restaurant?: Restaurant;
    ngo?: NGO;
  };
}

export class AuthService {
  /**
   * Registers a new user and associated organization inside an atomic transaction.
   */
  public static async register(dto: RegisterDTO): Promise<AuthResponse> {
    if (!dto.email || !dto.password || !dto.name || !dto.role) {
      throw new Error("VALIDATION_ERROR: Missing mandatory registration fields.");
    }

    const emailNormalized = dto.email.trim().toLowerCase();

    return await db.runInTransaction(async (tx) => {
      // 1. Check duplicate user
      const existingUser = tx.state.users.find((u) => u.email.toLowerCase() === emailNormalized);
      if (existingUser) {
        throw new Error("CONFLICT_ERROR: An account with this email already exists.");
      }

      let restaurantId: string | undefined;
      let ngoId: string | undefined;
      let createdRestaurant: Restaurant | undefined;
      let createdNGO: NGO | undefined;

      // 2. Organization creation based on role
      if (dto.role === "RESTAURANT_MANAGER") {
        if (!dto.restaurantName || !dto.fssaiLicenseNumber) {
          throw new Error("VALIDATION_ERROR: Restaurant name and 14-digit FSSAI License Number are required.");
        }
        restaurantId = crypto.randomUUID();
        createdRestaurant = {
          id: restaurantId,
          name: dto.restaurantName.trim(),
          cuisine: dto.cuisine || "Multi-Cuisine",
          address: dto.restaurantAddress || "Bangalore, Karnataka, India",
          latitude: dto.latitude ?? 12.9716,
          longitude: dto.longitude ?? 77.5946,
          phone: dto.phone || "+91 98765 43210",
          fssaiLicenseNumber: dto.fssaiLicenseNumber.trim(),
          createdAt: new Date().toISOString(),
        };
        tx.state.restaurants.push(createdRestaurant);
      } else if (dto.role === "NGO_COORDINATOR") {
        if (!dto.ngoName || !dto.regNumber) {
          throw new Error("VALIDATION_ERROR: NGO Name and Official Registration Number are required.");
        }
        ngoId = crypto.randomUUID();
        createdNGO = {
          id: ngoId,
          name: dto.ngoName.trim(),
          regNumber: dto.regNumber.trim(),
          contactPerson: dto.contactPerson || dto.name,
          address: dto.ngoAddress || "Bangalore, Karnataka, India",
          latitude: dto.latitude ?? 12.976,
          longitude: dto.longitude ?? 77.6033,
          phone: dto.phone || "+91 98765 12345",
          verificationStatus: "VERIFIED", // Verified by default for test/demo accounts
          fssaiSurplusDistributionPermit: dto.fssaiSurplusDistributionPermit || "FSSAI-IFSA-2026-0912",
          createdAt: new Date().toISOString(),
        };
        tx.state.ngos.push(createdNGO);
      }

      // 3. Hash password and insert user
      const passwordHash = await hashPassword(dto.password);
      const userId = crypto.randomUUID();

      const newUser: User = {
        id: userId,
        name: dto.name.trim(),
        email: emailNormalized,
        passwordHash,
        role: dto.role,
        restaurantId,
        ngoId,
        createdAt: new Date().toISOString(),
      };

      tx.state.users.push(newUser);

      // 4. Generate JWT
      const token = await createAuthToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        restaurantId: newUser.restaurantId,
        ngoId: newUser.ngoId,
        name: newUser.name,
      });

      return {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          restaurantId: newUser.restaurantId,
          ngoId: newUser.ngoId,
          restaurant: createdRestaurant,
          ngo: createdNGO,
        },
      };
    });
  }

  /**
   * Authenticates user with email and password.
   */
  public static async login(dto: LoginDTO): Promise<AuthResponse> {
    const emailNormalized = dto.email.trim().toLowerCase();
    const user = db.getState().users.find((u) => u.email.toLowerCase() === emailNormalized);

    if (!user) {
      throw new Error("AUTH_ERROR: Invalid email or password.");
    }

    const isMatch = await verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new Error("AUTH_ERROR: Invalid email or password.");
    }

    const restaurant = user.restaurantId
      ? db.getState().restaurants.find((r) => r.id === user.restaurantId)
      : undefined;

    const ngo = user.ngoId
      ? db.getState().ngos.find((n) => n.id === user.ngoId)
      : undefined;

    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      ngoId: user.ngoId,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        ngoId: user.ngoId,
        restaurant,
        ngo,
      },
    };
  }

  /**
   * Resolves current user from a Bearer token.
   */
  public static async getUserFromToken(token: string): Promise<AuthResponse["user"] | null> {
    const payload = await verifyAuthToken(token);
    if (!payload) return null;

    const user = db.getState().users.find((u) => u.id === payload.userId);
    if (!user) return null;

    const restaurant = user.restaurantId
      ? db.getState().restaurants.find((r) => r.id === user.restaurantId)
      : undefined;

    const ngo = user.ngoId
      ? db.getState().ngos.find((n) => n.id === user.ngoId)
      : undefined;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      ngoId: user.ngoId,
      restaurant,
      ngo,
    };
  }

  /**
   * Safeguard 6: Controlled demonstration role-switcher.
   * STRICTLY BLOCKED in production environments!
   */
  public static async switchDemoRole(targetUserId: string): Promise<AuthResponse> {
    const isDemoMode = process.env.DEMO_MODE === "true";
    if (!isDemoMode || process.env.NODE_ENV === "production") {
      throw new Error("FORBIDDEN: One-click role switching is strictly disabled in production environments.");
    }

    const user = db.getState().users.find((u) => u.id === targetUserId);
    if (!user) {
      throw new Error("NOT_FOUND: Demo user persona not found.");
    }

    const restaurant = user.restaurantId
      ? db.getState().restaurants.find((r) => r.id === user.restaurantId)
      : undefined;

    const ngo = user.ngoId
      ? db.getState().ngos.find((n) => n.id === user.ngoId)
      : undefined;

    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      ngoId: user.ngoId,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        ngoId: user.ngoId,
        restaurant,
        ngo,
      },
    };
  }
}
