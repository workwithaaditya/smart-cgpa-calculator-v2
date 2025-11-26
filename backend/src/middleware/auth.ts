/**
 * Authentication middleware
 * Supports both JWT tokens and session-based authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  // Check JWT token first
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'fallback-secret') as any;
      
      // Fetch user from database
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
        req.user = user;
        return next();
      }
    } catch (error) {
      // JWT invalid, fall through to session check
    }
  }
  
  // Fallback to session-based authentication
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Not authenticated' });
};

export const attachUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    req.user = req.user;
  }
  next();
};
