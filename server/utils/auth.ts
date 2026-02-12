import type { H3Event } from "h3";

import bcrypt from "bcrypt";
import { jwtVerify, SignJWT } from "jose";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateAccessToken(userId: number): Promise<string> {
  const { jwtSecret } = useRuntimeConfig();
  const secret = new TextEncoder().encode(jwtSecret);
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAccessToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { jwtSecret } = useRuntimeConfig();
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub)
      return null;
    return { userId: Number(payload.sub) };
  }
  catch {
    return null;
  }
}

export function setAuthCookies(
  event: H3Event,
  accessToken: string,
  refreshToken: string,
): void {
  setCookie(event, "access_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  setCookie(event, "refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, "access_token", { path: "/" });
  deleteCookie(event, "refresh_token", { path: "/" });
}
