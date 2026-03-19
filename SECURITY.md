# 🛡️ Security Implementation Guide

## ✅ Security Improvements Completed

### 1. JWT Authentication (Unified & Secure)

#### **What Changed**
- ❌ **Removed**: `express-session`, `passport-local`, localStorage JWT storage
- ✅ **Implemented**: JWT-only authentication with httpOnly cookies

#### **Benefits**
- **XSS Protection**: httpOnly cookies cannot be accessed by JavaScript
- **CSRF Protection**: sameSite=lax cookie attribute
- **Session-less**: No server-side session storage needed
- **Stateless**: JWT contains all user info, no database lookup per request

#### **Implementation Details**
```typescript
// Server-side: Set JWT as httpOnly cookie
res.cookie("auth_token", token, {
  httpOnly: true,        // Prevents JavaScript access
  secure: true,          // HTTPS only in production
  sameSite: "lax",       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});

// Client-side: Automatic cookie sending
fetch("/api/endpoint", {
  credentials: "include"  // Sends cookies automatically
});
```

---

### 2. Environment Variable Validation (Zod)

#### **What Changed**
- ✅ **Added**: `server/_core/env.ts` with Zod schema validation
- ✅ **Enforced**: Minimum 32-character JWT_SECRET in production
- ✅ **Checked**: OAuth credentials completeness

#### **Benefits**
- **Fail-fast**: Server won't start with invalid config
- **Type-safe**: Environment variables are strongly typed
- **Clear errors**: Validation errors show exactly what's missing

#### **Usage**
```typescript
import { ENV } from "@/server/_core/env";

// All env vars are validated and typed
const secret = ENV.JWT_SECRET;  // string (min 32 chars)
const port = ENV.PORT;           // number
```

---

### 3. Docker Security (Port Exposure)

#### **What Changed**
- ❌ **Removed**: MySQL port 3306 exposure to host
- ✅ **Added**: Internal network-only database access

#### **Benefits**
- **Reduced attack surface**: Database not accessible from internet
- **Internal-only**: Only app container can access database
- **Secure by default**: No accidental public DB exposure

#### **Database Access**
```bash
# For direct DB access (development/debugging):
docker exec -it <container-name> mysql -u shimamoto -p
```

---

### 4. Dependency Cleanup

#### **What Changed**
- ❌ **Removed**: `mysql2`, `express-session`, `passport-local`
- ✅ **Kept**: `postgres` (PostgreSQL driver), `passport` (OAuth only), `jsonwebtoken`

#### **Benefits**
- **Smaller bundle**: Fewer dependencies = faster builds
- **Less complexity**: Single database driver (PostgreSQL)
- **Security**: Fewer packages = fewer vulnerabilities

---

### 5. Input Validation (Zod)

#### **What Changed**
- ✅ **Added**: Zod schemas for all auth routes
- ✅ **Validated**: Email format, password length, required fields

#### **Example**
```typescript
const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

// Validate request body
const validation = loginSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({ 
    error: validation.error.errors[0].message 
  });
}
```

---

## 🚀 Production Deployment Checklist

### Before Deploying to Production

#### 1. Environment Variables
```bash
# Generate strong JWT secret (32+ characters)
openssl rand -base64 32

# Generate VAPID keys (if using Web Push)
npx web-push generate-vapid-keys
```

#### 2. Update `.env` file
```env
NODE_ENV=production
JWT_SECRET=<generated-32-char-secret>
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
VAPID_PUBLIC_KEY=<generated-key>
VAPID_PRIVATE_KEY=<generated-key>
```

#### 3. Security Configuration
- [ ] JWT_SECRET is at least 32 characters
- [ ] DATABASE_URL uses SSL/TLS (`sslmode=require`)
- [ ] OAuth credentials are from production apps (not dev)
- [ ] All secrets are in environment variables (not committed to git)

#### 4. Docker Deployment
```bash
# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Verify database is NOT exposed
netstat -tuln | grep 3306  # Should return nothing
```

#### 5. Test Authentication Flow
```bash
# 1. Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}' \
  -c cookies.txt

# 2. Login (cookie should be set)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 3. Access protected route (using cookie)
curl http://localhost:3000/api/auth/me -b cookies.txt

# 4. Logout (cookie should be cleared)
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

---

## 🔒 Security Best Practices

### Implemented ✅

1. **JWT in httpOnly cookies** - XSS protection
2. **SameSite=lax** - CSRF protection
3. **Environment validation** - Fail-fast on missing config
4. **Input validation (Zod)** - Prevent injection attacks
5. **Database internal network** - Reduced attack surface
6. **No session storage** - Stateless architecture
7. **OAuth without session** - JWT-only flow

### Recommended (Next Steps)

1. **Rate limiting** - Prevent brute force attacks
   ```typescript
   import rateLimit from "express-rate-limit";
   
   app.use("/api/auth", rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5 // 5 requests per window
   }));
   ```

2. **CORS configuration** - Restrict allowed origins
   ```typescript
   import cors from "cors";
   
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS.split(","),
     credentials: true
   }));
   ```

3. **Helmet.js** - Security headers
   ```typescript
   import helmet from "helmet";
   app.use(helmet());
   ```

4. **Database connection pooling** - Performance + security
5. **SSL/TLS certificates** - HTTPS in production
6. **Regular dependency audits** - `npm audit fix`

---

## 📝 Migration Guide (for Existing Deployments)

### If You're Already Running This App

1. **Users will be logged out** - JWT storage changed from localStorage to httpOnly cookies
2. **OAuth flows updated** - No more token in URL, cookie-based instead
3. **Database access changed** - Port 3306 no longer exposed (use docker exec)

### Steps to Migrate

```bash
# 1. Pull latest code
git pull origin main

# 2. Update dependencies
npm install

# 3. Regenerate JWT secret (invalidates all existing sessions)
openssl rand -base64 32
# Update .env with new JWT_SECRET

# 4. Rebuild and restart
docker-compose down
docker-compose up -d --build

# 5. Run database migrations (if any)
npm run db:push
```

---

## 🐛 Troubleshooting

### "JWT_SECRET must be at least 32 characters"
**Solution**: Generate a strong secret with `openssl rand -base64 32`

### "Cookie not being set"
**Solution**: Ensure `credentials: "include"` in fetch requests and `secure: false` for local development

### "Database connection refused"
**Solution**: Check `DATABASE_URL` format and database container status with `docker-compose ps`

### "OAuth callback fails"
**Solution**: Update callback URLs in Google/GitHub OAuth app settings to match your domain

---

## 📚 Additional Resources

- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [httpOnly Cookie Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)
- [Zod Documentation](https://zod.dev/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
