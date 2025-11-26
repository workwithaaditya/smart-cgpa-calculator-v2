/**
 * Subject Routes - CRUD operations for user subjects
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { computeSubjectMetrics } from '../utils/calculations.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(isAuthenticated);

// GET all subjects for current user
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    const subjects = await prisma.subject.findMany({
      where: { userId },
      include: {
        semester: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET subjects for active semester
router.get('/active', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    const activeSemester = await prisma.semester.findFirst({
      where: { userId, isActive: true }
    });

    if (!activeSemester) {
      return res.json({ subjects: [] });
    }

    const subjects = await prisma.subject.findMany({
      where: { 
        userId,
        semesterId: activeSemester.id 
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ subjects, semester: activeSemester });
  } catch (error) {
    console.error('Error fetching active subjects:', error);
    res.status(500).json({ error: 'Failed to fetch active subjects' });
  }
});

// GET single subject
router.get('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;

    const subject = await prisma.subject.findFirst({
      where: { id, userId },
      include: { semester: true }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

// POST create new subject
router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { code, name, cie, see, credits, semesterId } = req.body;

    // Validation
    if (!code || !name || cie === undefined || credits === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (cie < 0 || cie > 50) {
      return res.status(400).json({ error: 'CIE must be between 0 and 50' });
    }

    if (see !== undefined && (see < 0 || see > 100)) {
      return res.status(400).json({ error: 'SEE must be between 0 and 100' });
    }

    if (credits <= 0) {
      return res.status(400).json({ error: 'Credits must be positive' });
    }

    // If no semesterId provided, use active semester
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const activeSemester = await prisma.semester.findFirst({
        where: { userId, isActive: true }
      });
      
      if (!activeSemester) {
        // Create default semester if none exists
        const newSemester = await prisma.semester.create({
          data: {
            userId,
            name: 'Current Semester',
            isActive: true
          }
        });
        targetSemesterId = newSemester.id;
      } else {
        targetSemesterId = activeSemester.id;
      }
    }

    const cieVal = parseFloat(cie);
    const seeVal = see !== undefined ? parseFloat(see) : 0;
    const creditsVal = parseInt(credits);
    const metrics = computeSubjectMetrics(cieVal, seeVal, creditsVal);

    const subject = await prisma.subject.create({
      data: {
        userId,
        semesterId: targetSemesterId,
        code,
        name,
        cie: cieVal,
        see: seeVal,
        credits: creditsVal,
        total: metrics.total,
        gp: metrics.gp,
        weighted: metrics.weighted
      }
    });

    res.status(201).json({ subject });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// PUT update subject
router.put('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;
    const { code, name, cie, see, credits, semesterId } = req.body;

    // Verify ownership
    const existing = await prisma.subject.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Validation
    if (cie !== undefined && (cie < 0 || cie > 50)) {
      return res.status(400).json({ error: 'CIE must be between 0 and 50' });
    }

    if (see !== undefined && (see < 0 || see > 100)) {
      return res.status(400).json({ error: 'SEE must be between 0 and 100' });
    }

    if (credits !== undefined && credits <= 0) {
      return res.status(400).json({ error: 'Credits must be positive' });
    }

    const cieVal = cie !== undefined ? parseFloat(cie) : existing.cie;
    const seeVal = see !== undefined ? parseFloat(see) : existing.see;
    const creditsVal = credits !== undefined ? parseInt(credits) : existing.credits;
    const metrics = computeSubjectMetrics(cieVal, seeVal, creditsVal);

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        cie: cieVal,
        see: seeVal,
        credits: creditsVal,
        ...(semesterId && { semesterId }),
        total: metrics.total,
        gp: metrics.gp,
        weighted: metrics.weighted
      }
    });

    res.json({ subject });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// PATCH update only SEE (common operation)
router.patch('/:id/see', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;
    const { see } = req.body;

    if (see === undefined || see < 0 || see > 100) {
      return res.status(400).json({ error: 'SEE must be between 0 and 100' });
    }

    // Verify ownership
    const existing = await prisma.subject.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const seeVal = parseFloat(see);
    const metrics = computeSubjectMetrics(existing.cie, seeVal, existing.credits);
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        see: seeVal,
        total: metrics.total,
        gp: metrics.gp,
        weighted: metrics.weighted
      }
    });

    res.json({ subject });
  } catch (error) {
    console.error('Error updating SEE:', error);
    res.status(500).json({ error: 'Failed to update SEE' });
  }
});

// DELETE subject
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.subject.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    await prisma.subject.delete({
      where: { id }
    });

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// POST bulk create subjects
router.post('/bulk', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Invalid subjects array' });
    }

    // Get or create active semester
    let activeSemester = await prisma.semester.findFirst({
      where: { userId, isActive: true }
    });

    if (!activeSemester) {
      activeSemester = await prisma.semester.create({
        data: {
          userId,
          name: 'Current Semester',
          isActive: true
        }
      });
    }

    // Create all subjects
    const createdSubjects = await prisma.$transaction(
      subjects.map(sub => {
        const cieVal = parseFloat(sub.cie);
        const seeVal = sub.see !== undefined ? parseFloat(sub.see) : 0;
        const creditsVal = parseInt(sub.credits);
        const metrics = computeSubjectMetrics(cieVal, seeVal, creditsVal);
        return prisma.subject.create({
          data: {
            userId,
            semesterId: activeSemester!.id,
            code: sub.code,
            name: sub.name,
            cie: cieVal,
            see: seeVal,
            credits: creditsVal,
            total: metrics.total,
            gp: metrics.gp,
            weighted: metrics.weighted
          }
        });
      })
    );
// POST recalculate cached metrics for all user subjects
router.post('/recalculate', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const subjects = await prisma.subject.findMany({ where: { userId } });
    const updates = subjects.map(s => {
      const metrics = computeSubjectMetrics(s.cie, s.see, s.credits);
      return prisma.subject.update({
        where: { id: s.id },
        data: { total: metrics.total, gp: metrics.gp, weighted: metrics.weighted }
      });
    });
    const updated = await prisma.$transaction(updates);
    res.json({ updatedCount: updated.length });
  } catch (error) {
    console.error('Error recalculating subjects:', error);
    res.status(500).json({ error: 'Failed to recalculate subjects' });
  }
});

    res.status(201).json({ subjects: createdSubjects });
  } catch (error) {
    console.error('Error bulk creating subjects:', error);
    res.status(500).json({ error: 'Failed to bulk create subjects' });
  }
});

export default router;
