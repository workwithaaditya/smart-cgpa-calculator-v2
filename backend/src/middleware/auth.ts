/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
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
