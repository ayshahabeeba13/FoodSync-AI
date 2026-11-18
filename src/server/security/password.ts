import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return await bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, passwordHash);
}
