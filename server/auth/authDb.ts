import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { users, oauthAccounts, InsertUser, InsertOAuthAccount, User, OAuthAccount } from "../../drizzle/schema";
import { hashPassword } from "./authService";

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create a new user with email/password
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const passwordHash = await hashPassword(password);
  
  const userData: InsertUser = {
    email,
    passwordHash,
    name: name || null,
    role: "user",
  };
  
  const result = await db.insert(users).values(userData);
  const userId = Number(result[0].insertId);
  
  const newUser = await findUserById(userId);
  if (!newUser) throw new Error("Failed to create user");
  
  return newUser;
}

/**
 * Find OAuth account by provider and provider ID
 */
export async function findOAuthAccount(
  provider: string,
  providerId: string
): Promise<OAuthAccount | null> {
  const result = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerId, providerId)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create or update user via OAuth
 */
export async function upsertOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  name?: string,
  accessToken?: string,
  refreshToken?: string
): Promise<User> {
  // Check if OAuth account exists
  const existingOAuth = await findOAuthAccount(provider, providerId);
  
  if (existingOAuth) {
    // Update existing user's last sign in
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, existingOAuth.userId));
    
    // Update OAuth tokens
    await db
      .update(oauthAccounts)
      .set({
        accessToken,
        refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(oauthAccounts.id, existingOAuth.id));
    
    const user = await findUserById(existingOAuth.userId);
    if (!user) throw new Error("User not found");
    return user;
  }
  
  // Check if user exists with this email
  let user = await findUserByEmail(email);
  
  if (!user) {
    // Create new user
    const userData: InsertUser = {
      email,
      name: name || null,
      role: "user",
      passwordHash: null, // OAuth users don't have password
    };
    
    const result = await db.insert(users).values(userData);
    const userId = Number(result[0].insertId);
    
    user = await findUserById(userId);
    if (!user) throw new Error("Failed to create user");
  }
  
  // Link OAuth account
  const oauthData: InsertOAuthAccount = {
    userId: user.id,
    provider,
    providerId,
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
  };
  
  await db.insert(oauthAccounts).values(oauthData);
  
  return user;
}

/**
 * Update user's last sign in time
 */
export async function updateLastSignIn(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}
