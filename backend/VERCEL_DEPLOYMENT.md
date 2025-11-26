# Backend Deployment to Vercel

## Prerequisites
1. Vercel account
2. PostgreSQL database (Vercel Postgres, Supabase, or Neon)
3. Google OAuth credentials

## Step 1: Set Up PostgreSQL Database

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database" → "Postgres"
3. Copy the `DATABASE_URL` connection string

### Option B: Supabase (Free Tier)
1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database → Connection string → URI
4. Copy the connection string

### Option C: Neon (Serverless)
1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string

## Step 2: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Update your OAuth client with these redirect URIs:
   ```
   https://your-backend.vercel.app/auth/google/callback
   ```
5. Copy your Client ID and Client Secret

## Step 3: Deploy Backend to Vercel

### Using Vercel CLI:

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Navigate to backend directory
cd backend

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Using Vercel Dashboard:

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set **Root Directory** to: `backend`
4. Click "Deploy"

## Step 4: Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=generate-a-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.vercel.app/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Redeploy After Setting Variables

After adding environment variables, trigger a redeployment:
- In Vercel dashboard → Deployments → Click "..." → Redeploy

## Step 6: Update Frontend Environment Variable

In your frontend Vercel project settings, add:
```env
VITE_API_URL=https://your-backend.vercel.app
```

Then redeploy your frontend.

## Step 7: Test the Deployment

1. Visit your frontend URL: `https://your-frontend.vercel.app`
2. Test the Google login functionality
3. Check that subjects are being saved to the database

## Troubleshooting

### Database Connection Issues
- Ensure DATABASE_URL is correct and accessible from Vercel
- Check if your database allows external connections
- Verify SSL settings in connection string

### OAuth Issues
- Verify redirect URIs match exactly (including https)
- Check that Google OAuth consent screen is configured
- Ensure FRONTEND_URL and GOOGLE_CALLBACK_URL are correct

### Build Failures
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Verify prisma schema is valid

## Monitoring

- Check Vercel Function logs for errors
- Monitor database connections
- Set up Vercel Analytics for performance tracking

## Important Notes

⚠️ **Vercel Serverless Functions have a 10-second timeout on Hobby plan**
- For long-running operations, consider upgrading or using a different platform

⚠️ **Cold Starts**
- First request after inactivity may be slower
- Keep-alive pings can help but use Vercel resources

⚠️ **Database Connections**
- Use connection pooling (Prisma handles this)
- Consider using Prisma Data Proxy for better connection management
