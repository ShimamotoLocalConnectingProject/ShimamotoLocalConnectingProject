import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { findUserById, upsertOAuthUser } from "./authDb";
import { ENV } from "../_core/env";

/**
 * Configure Passport strategies
 * NOTE: NO session support - JWT only
 */
export function configurePassport() {
  // NOTE: serializeUser and deserializeUser are NOT used
  // We use JWT tokens instead of sessions
  
  // Google OAuth Strategy
  if (ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: ENV.GOOGLE_CLIENT_ID,
          clientSecret: ENV.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google"), undefined);
            }
            
            const user = await upsertOAuthUser(
              "google",
              profile.id,
              email,
              profile.displayName,
              accessToken,
              refreshToken
            );
            
            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }

  // GitHub OAuth Strategy
  if (ENV.GITHUB_CLIENT_ID && ENV.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: ENV.GITHUB_CLIENT_ID,
          clientSecret: ENV.GITHUB_CLIENT_SECRET,
          callbackURL: "/api/auth/github/callback",
          scope: ["user:email"],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from GitHub"), undefined);
            }
            
            const user = await upsertOAuthUser(
              "github",
              profile.id,
              email,
              profile.displayName || profile.username,
              accessToken,
              refreshToken
            );
            
            return done(null, user);
          } catch (error) {
            return done(error, undefined);
          }
        }
      )
    );
  }
}
