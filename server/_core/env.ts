import { z } from "zod";

/**
 * Environment variable validation schema
 * Ensures all required config is present and valid before server starts
 */
const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
  
  // Database (PostgreSQL recommended)
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
  
  // JWT Security
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for production security"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  
  // OAuth (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  
  // VAPID for Web Push (Optional)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional(),
  
  // S3/R2 (Optional)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws error if validation fails
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Additional runtime checks
    if (parsed.NODE_ENV === "production") {
      if (parsed.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters in production");
      }
      if (parsed.JWT_SECRET.includes("change-this") || parsed.JWT_SECRET.includes("your-secret")) {
        throw new Error("JWT_SECRET must be changed from default value in production");
      }
    }
    
    // OAuth validation
    const hasGoogleOAuth = !!parsed.GOOGLE_CLIENT_ID || !!parsed.GOOGLE_CLIENT_SECRET;
    if (hasGoogleOAuth && (!parsed.GOOGLE_CLIENT_ID || !parsed.GOOGLE_CLIENT_SECRET)) {
      throw new Error("Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required if using Google OAuth");
    }
    
    const hasGitHubOAuth = !!parsed.GITHUB_CLIENT_ID || !!parsed.GITHUB_CLIENT_SECRET;
    if (hasGitHubOAuth && (!parsed.GITHUB_CLIENT_ID || !parsed.GITHUB_CLIENT_SECRET)) {
      throw new Error("Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required if using GitHub OAuth");
    }
    
    // VAPID validation
    const hasVapid = !!parsed.VAPID_PUBLIC_KEY || !!parsed.VAPID_PRIVATE_KEY || !!parsed.VAPID_SUBJECT;
    if (hasVapid && (!parsed.VAPID_PUBLIC_KEY || !parsed.VAPID_PRIVATE_KEY || !parsed.VAPID_SUBJECT)) {
      console.warn("⚠️  Warning: VAPID keys incomplete. Web Push notifications will not work.");
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((issue) => {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      });
      throw new Error("Invalid environment variables. Check .env file.");
    }
    throw error;
  }
}

// Validate immediately on import
export const ENV = validateEnv();

console.log("✅ Environment variables validated successfully");
