/**
 * Semester Routes - Manage user semesters
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(isAuthenticated);

// GET all semesters
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    const semesters = await prisma.semester.findMany({
      where: { userId },
      include: {
        subjects: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ semesters });
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

// GET active semester
router.get('/active', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    const semester = await prisma.semester.findFirst({
      where: { userId, isActive: true },
      include: {
        subjects: true
      }
    });

    if (!semester) {
      return res.status(404).json({ error: 'No active semester found' });
    }

    res.json({ semester });
  } catch (error) {
    console.error('Error fetching active semester:', error);
    res.status(500).json({ error: 'Failed to fetch active semester' });
  }
});

// POST create semester
router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { name, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Semester name is required' });
    }

    // If setting as active, deactivate all others
    if (isActive) {
      await prisma.semester.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      });
    }

    const semester = await prisma.semester.create({
      data: {
        userId,
        name,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json({ semester });
  } catch (error) {
    console.error('Error creating semester:', error);
    res.status(500).json({ error: 'Failed to create semester' });
  }
});

// PUT set active semester
router.put('/:id/activate', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.semester.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    // Deactivate all, activate this one
    await prisma.$transaction([
      prisma.semester.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      }),
      prisma.semester.update({
        where: { id },
        data: { isActive: true }
      })
    ]);

    const semester = await prisma.semester.findUnique({
      where: { id },
      include: { subjects: true }
    });

    res.json({ semester });
  } catch (error) {
    console.error('Error activating semester:', error);
    res.status(500).json({ error: 'Failed to activate semester' });
  }
});

// DELETE semester
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { id } = req.params;

    const existing = await prisma.semester.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    await prisma.semester.delete({
      where: { id }
    });

    res.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    console.error('Error deleting semester:', error);
    res.status(500).json({ error: 'Failed to delete semester' });
  }
});

export default router;
