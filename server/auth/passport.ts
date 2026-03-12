import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { findUserByEmail, findUserById, upsertOAuthUser } from "./authDb";
import { verifyPassword } from "./authService";
import { User } from "../../drizzle/schema";

/**
 * Configure Passport strategies
 */
export function configurePassport() {
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await findUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local Strategy (Email/Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await findUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
          }
          
          if (!user.passwordHash) {
            return done(null, false, { message: "このアカウントはOAuth認証のみ対応しています" });
          }
          
          const isValid = await verifyPassword(password, user.passwordHash);
          
          if (!isValid) {
            return done(null, false, { message: "メールアドレスまたはパスワードが正しくありません" });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
