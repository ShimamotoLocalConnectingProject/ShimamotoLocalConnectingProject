import { Request, Response, NextFunction } from "express";
import { verifyToken, extractToken } from "./authService";
import { findUserById } from "./authDb";
import { User } from "../../drizzle/schema";

/**
 * Middleware to authenticate JWT token from cookie or Authorization header
 * Adds user to request object if valid
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      (req as any).user = null;
      return next();
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      (req as any).user = null;
      return next();
    }
    
    // Fetch fresh user data from database
    const user = await findUserById(payload.userId);
    
    if (!user) {
      (req as any).user = null;
      return next();
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    (req as any).user = null;
    next();
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as User | null;
  
  if (!user) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  
  next();
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as User | null;
  
  if (!user) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  
  if (user.role !== "admin") {
    res.status(403).json({ error: "管理者権限が必要です" });
    return;
  }
  
  next();
}
