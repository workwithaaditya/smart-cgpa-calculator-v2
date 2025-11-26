# Backend Setup Guide - Smart CGPA Calculator

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Google Cloud Platform account (for OAuth)

---

## 📦 Step 1: Install PostgreSQL

### Windows (using Chocolatey)
```powershell
choco install postgresql
```

### Or download from: https://www.postgresql.org/download/windows/

After installation, start PostgreSQL service:
```powershell
Start-Service postgresql-x64-14
```

---

## 🔧 Step 2: Create Database

Open PostgreSQL command line:
```powershell
psql -U postgres
```

Create database:
```sql
CREATE DATABASE smart_cgpa_db;
\q
```

---

## 🔑 Step 3: Set Up Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen:
   - User Type: External
   - App name: Smart CGPA Calculator
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Smart CGPA Calculator
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
7. Copy **Client ID** and **Client Secret**

---

## ⚙️ Step 4: Configure Environment Variables

1. Navigate to backend folder:
```powershell
cd backend
```

2. Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

3. Edit `.env` file with your details:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_cgpa_db?schema=public"
SESSION_SECRET="GENERATE_A_RANDOM_STRING"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/auth/google/callback"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Generate SESSION_SECRET:**
```powershell
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 2: Online generator
# Visit: https://randomkeygen.com/
```

---

## 📥 Step 5: Install Dependencies

In the backend folder:
```powershell
npm install
```

This installs:
- Express (web server)
- Prisma (ORM)
- Passport (authentication)
- Google OAuth strategy
- PostgreSQL drivers
- TypeScript support

---

## 🗄️ Step 6: Initialize Database Schema

Generate Prisma Client:
```powershell
npm run generate
```

Run database migrations:
```powershell
npm run migrate
```

This creates all tables:
- `User` - authenticated users
- `Subject` - subject data per user
- `Semester` - semester organization
- `Session` - login sessions

---

## ▶️ Step 7: Start Backend Server

Development mode (with hot reload):
```powershell
npm run dev
```

Production mode:
```powershell
npm run build
npm start
```

You should see:
```
✓ Server running on http://localhost:5000
✓ Environment: development
✓ Frontend URL: http://localhost:3000
✓ Database connected: Yes
```

---

## 🧪 Step 8: Test API Endpoints

### Health Check
```powershell
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T...",
  "authenticated": false
}
```

### Check Auth Status
```powershell
curl http://localhost:5000/auth/status
```

---

## 🔗 Step 9: Update Frontend for Backend Integration

The frontend needs to be updated to:
1. Add authentication flow
2. Fetch/save subjects from backend
3. Handle login/logout
4. Display user info

I'll provide the updated frontend files next!

---

## 📊 Step 10: View Database (Optional)

Open Prisma Studio to view data:
```powershell
npm run studio
```

Opens browser at `http://localhost:5555` with database GUI.

---

## 🐛 Troubleshooting

### Database Connection Failed
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-14

# Test connection
psql -U postgres -d smart_cgpa_db
```

### Port Already in Use
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change PORT in .env
```

### OAuth Redirect Mismatch
- Ensure redirect URI in Google Console **exactly** matches:
  `http://localhost:5000/auth/google/callback`
- No trailing slash
- Check protocol (http vs https)

### Prisma Migration Errors
```powershell
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Then run migrations again
npm run migrate
```

---

## 🔐 Security Notes for Production

1. **HTTPS**: Use HTTPS in production
2. **SESSION_SECRET**: Use strong random string
3. **DATABASE_URL**: Use environment variables, never commit
4. **CORS**: Restrict to your domain only
5. **Rate Limiting**: Add rate limiting middleware
6. **Helmet**: Add helmet.js for security headers

---

## 📁 Backend File Structure

```
backend/
├── src/
│   ├── server.ts                  # Main server file
│   ├── auth/
│   │   └── passport-config.ts     # Google OAuth setup
│   ├── middleware/
│   │   └── auth.ts                # Auth middleware
│   └── routes/
│       ├── auth.ts                # Login/logout routes
│       ├── subjects.ts            # Subject CRUD + metric caching
│       ├── semesters.ts           # Semester management
│       ├── calculations.ts        # SGPA + CGPA routes
│       ├── export.ts              # JSON/PDF export endpoints
│       └── utils/
│           └── calculations.ts    # Shared calculation helpers
├── prisma/
│   └── schema.prisma              # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🎯 API Endpoints

### Authentication
- `GET /auth/google` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/logout` - Logout user
- `GET /auth/user` - Get current user
- `GET /auth/status` - Check auth status

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/active` - Get active semester subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `PATCH /api/subjects/:id/see` - Update only SEE
- `DELETE /api/subjects/:id` - Delete subject
- `POST /api/subjects/bulk` - Bulk create

### Semesters
- `GET /api/semesters` - Get all semesters
- `GET /api/semesters/active` - Get active semester
- `POST /api/semesters` - Create semester
- `PUT /api/semesters/:id/activate` - Set active
- `DELETE /api/semesters/:id` - Delete semester

### Calculations
- `POST /api/calculate/sgpa` - Calculate SGPA (auto fetch or accept subjects)
- `GET /api/calculate/cgpa` - Aggregate CGPA across all semesters

### Subjects Utility
- `POST /api/subjects/recalculate` - Recompute cached `total`, `gp`, `weighted` for all subjects

### Export
- `GET /api/export/json` - Full structured JSON (CGPA, semester SGPA, subjects)
- `GET /api/export/pdf` - Download PDF summary report

---

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `smart_cgpa_db` created
- [ ] Google OAuth credentials obtained
- [ ] `.env` file configured with all values
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma Client generated (`npm run generate`)
- [ ] Migrations run successfully (`npm run migrate`)
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health check responds
- [ ] Can access Prisma Studio (`npm run studio`)

---

**Backend is ready! Next step: Update frontend to integrate with authentication and new API endpoints (CGPA, export, caching).**

### New Features Summary
- Cached metrics stored on subject create/update for performance.
- Recalculate endpoint if grading rules change.
- CGPA endpoint aggregates weighted SGPA across semesters.
- Export endpoints produce machine-readable JSON and a human-friendly PDF.
- Utility module centralizes calculation logic used by routes.

### CORS Update
Default CORS now allows both `http://localhost:5173` (Vite) and `http://localhost:3000`. Override with comma-separated `FRONTEND_URL` in `.env` for production.
