import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { createUserWithPassword, findUserByEmail, updateLastSignIn } from "./authDb";
import { generateToken, verifyPassword } from "./authService";
import { User } from "../../drizzle/schema";
import { logAudit } from "../db";

const router = Router();

/**
 * Register new user with email/password
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "メールアドレスとパスワードは必須です" });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: "パスワードは8文字以上である必要があります" });
    }
    
    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "このメールアドレスは既に登録されています" });
    }
    
    // Create user
    const user = await createUserWithPassword(email, password, name);
    
    // Audit log
    logAudit({
      action: "auth.register",
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { name: user.name },
    });
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Return user info and token
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Audit log (失敗)
    logAudit({
      action: "auth.register",
      userEmail: req.body.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      success: false,
      errorMessage: String(error),
    });
    
    res.status(500).json({ error: "登録に失敗しました" });
  }
});

/**
 * Login with email/password
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "メールアドレスとパスワードは必須です" });
    }
    
    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    }
    
    // Check if user has password (not OAuth-only)
    if (!user.passwordHash) {
      return res.status(401).json({ error: "このアカウントはOAuth認証のみ対応しています" });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Audit log (ログイン失敗)
      logAudit({
        action: "auth.login_failed",
        userEmail: email,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
        errorMessage: "Invalid password",
      });
      return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    }
    
    // Update last sign in
    await updateLastSignIn(user.id);
    
    // Audit log (ログイン成功)
    logAudit({
      action: "auth.login",
      userId: user.id,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "ログインに失敗しました" });
  }
});

/**
 * Get current user info
 */
router.get("/me", async (req: Request, res: Response) => {
  const user = (req as any).user as User | undefined;
  
  if (!user) {
    return res.status(401).json({ error: "認証が必要です" });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

/**
 * Google OAuth routes
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=google" }),
  (req: Request, res: Response) => {
    const user = req.user as User;
    const token = generateToken(user);
    
    // Redirect to frontend with token
    res.redirect(`/?token=${token}`);
  }
);

/**
 * GitHub OAuth routes
 */
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/login?error=github" }),
  (req: Request, res: Response) => {
    const user = req.user as User;
    const token = generateToken(user);
    
    // Redirect to frontend with token
    res.redirect(`/?token=${token}`);
  }
);

/**
 * Logout (client-side should remove token)
 */
router.post("/logout", (req: Request, res: Response) => {
  res.json({ success: true, message: "ログアウトしました" });
});

export default router;
