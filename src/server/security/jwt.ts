import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "RESTAURANT_MANAGER" | "RESTAURANT_STAFF" | "NGO_COORDINATOR" | "PLATFORM_ADMIN";
  restaurantId?: string;
  ngoId?: string;
  name: string;
}

const JWT_SECRET_STRING = process.env.JWT_SECRET || "super-secure-foodsync-ai-secret-key-min-32-chars-2026";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export async function createAuthToken(payload: JWTPayload, expiresIn: string = "24h"): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET_KEY);
}

export async function verifyAuthToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as JWTPayload["role"],
      restaurantId: payload.restaurantId as string | undefined,
      ngoId: payload.ngoId as string | undefined,
      name: payload.name as string,
    };
  } catch (err) {
    return null;
  }
}
