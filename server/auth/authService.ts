import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { Response } from "express";

const JWT_SECRET = ENV.JWT_SECRET;
const JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN;
const SALT_ROUNDS = 10;

// Cookie configuration
export const JWT_COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Set JWT token as httpOnly cookie
 * This is more secure than localStorage (prevents XSS attacks)
 */
export function setAuthCookie(res: Response, user: User): void {
  const token = generateToken(user);
  
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: ENV.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // CSRF protection
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header OR cookie
 * Priority: Cookie > Authorization header (cookie is more secure)
 */
export function extractToken(req: any): string | null {
  // 1. Try cookie first (httpOnly, more secure)
  const cookieToken = req.cookies?.[JWT_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  
  // 2. Fallback to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  
  return parts[1];
}
