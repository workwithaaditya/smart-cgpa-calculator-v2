/**
 * Authentication Routes
 */

import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: +'${process.env.FRONTEND_URL}/?error=auth_failed'+
  }),
  (req, res) => {
    const user = req.user as any;
    
    // Generate JWT token with full user data
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name,
        image: user.image
      },
      process.env.SESSION_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );
    
    // Redirect to frontend with token
    res.redirect(+'${process.env.FRONTEND_URL}/?token='+);
  }
);

// Verify JWT token middleware
export const verifyToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'fallback-secret') as any;
    
    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check auth status (backward compatible with session)
router.get('/status', async (req, res) => {
  // Check JWT token first
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'fallback-secret') as any;
      
      // Fetch fresh user data
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true
        }
      });
      
      if (user) {
        return res.json({
          isAuthenticated: true,
          user
        });
      }
    } catch (error) {
      // Token invalid, fall through to session check
    }
  }
  
  // Fallback to session-based auth
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Get current user
router.get('/user', async (req, res) => {
  // Check JWT token first
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'fallback-secret') as any;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true
        }
      });
      
      if (user) {
        return res.json({ user });
      }
    } catch (error) {
      // Token invalid, fall through to session check
    }
  }
  
  // Fallback to session
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

export default router;
