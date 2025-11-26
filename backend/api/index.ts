/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express app for serverless deployment
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import connectPgSimple from 'connect-pg-simple';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from '../src/routes/auth.js';
import subjectRoutes from '../src/routes/subjects.js';
import semesterRoutes from '../src/routes/semesters.js';
import exportRoutes from '../src/routes/export.js';

// Import Passport config
import '../src/auth/passport-config.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PgSession = connectPgSimple(session);

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://smart-cgpa-calculator-kohl.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Session configuration
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session_store'
    }),
    secret: process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/export', exportRoutes);

// Export for Vercel
export default app;
