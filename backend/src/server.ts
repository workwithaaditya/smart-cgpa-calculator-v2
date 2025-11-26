/**
 * Express Server with Google OAuth 2.0 and Prisma
 * 
 * Provides authentication and CRUD operations for SGPA Calculator
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - no types available
import connectPgSimple from 'connect-pg-simple';
import { PrismaClient } from '@prisma/client';
// @ts-ignore - .js extension required for ES modules
import './auth/passport-config.js';
// @ts-ignore - .js extension required for ES modules
import authRoutes from './routes/auth.js';
// @ts-ignore - .js extension required for ES modules
import subjectRoutes from './routes/subjects.js';
// @ts-ignore - .js extension required for ES modules
import semesterRoutes from './routes/semesters.js';
// @ts-ignore - .js extension required for ES modules
import calculationRoutes from './routes/calculations.js';
// @ts-ignore - .js extension required for ES modules
import exportRoutes from './routes/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgSessionStore = connectPgSimple(session);

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173','http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration with PostgreSQL store
app.use(session({
  store: new PgSessionStore({
    conString: process.env.DATABASE_URL,
    tableName: 'session_store', // Use different table name to avoid conflict with NextAuth Session model
    createTableIfMissing: true
  }),
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    authenticated: req.isAuthenticated()
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/calculate', calculationRoutes);
app.use('/api/export', exportRoutes);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✓ Database connected: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
});

export default app;
