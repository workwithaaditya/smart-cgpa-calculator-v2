/**
 * Passport Google OAuth 2.0 Configuration
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Serialize user into session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true
      }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth 2.0 Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: 'https://smart-cgpa-calculator-v20.vercel.app/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || '';
      
      // Check if account exists (using Account table for OAuth)
      let account = await prisma.account.findFirst({
        where: {
          provider: 'google',
          providerAccountId: profile.id
        },
        include: { user: true }
      });

      let user;
      
      if (!account) {
        // Create new user and account
        user = await prisma.user.create({
          data: {
            email: email,
            name: profile.displayName,
            image: profile.photos?.[0]?.value,
            emailVerified: new Date(),
            accounts: {
              create: {
                type: 'oauth',
                provider: 'google',
                providerAccountId: profile.id,
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: 'profile email'
              }
            }
          }
        });
        
        console.log('✓ New user created:', user.email);
        
        // Create default active semester for new user
        await prisma.semester.create({
          data: {
            userId: user.id,
            name: 'Current Semester',
            isActive: true
          }
        });
      } else {
        user = account.user;
        
        // Update user info and tokens
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: profile.displayName,
            image: profile.photos?.[0]?.value
          }
        });
        
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: accessToken,
            refresh_token: refreshToken
          }
        });
      }

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error);
      return done(error as Error, undefined);
    }
  }
));

export default passport;
