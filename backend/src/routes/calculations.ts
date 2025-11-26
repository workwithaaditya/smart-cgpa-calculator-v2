/**
 * Calculation Routes - SGPA/CGPA calculations
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { aggregateSGPA, aggregateCGPA } from '../utils/calculations.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(isAuthenticated);

// POST calculate SGPA for current semester
router.post('/sgpa', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { subjects: clientSubjects } = req.body;

    let subjects;
    
    if (clientSubjects && Array.isArray(clientSubjects)) {
      // Use provided subjects
      subjects = clientSubjects;
    } else {
      // Fetch from database
      const activeSemester = await prisma.semester.findFirst({
        where: { userId, isActive: true },
        include: { subjects: true }
      });

      if (!activeSemester || activeSemester.subjects.length === 0) {
        return res.status(400).json({ error: 'No subjects found' });
      }

      subjects = activeSemester.subjects;
    }

    const { sgpa, totalCredits, totalWeighted, maxSgpaIfAll100 } = aggregateSGPA(subjects);
    res.json({ sgpa, totalCredits, totalWeighted, maxSgpaIfAll100 });
  } catch (error) {
    console.error('Error calculating SGPA:', error);
    res.status(500).json({ error: 'Failed to calculate SGPA' });
  }
});

// GET CGPA across all semesters
router.get('/cgpa', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const semesters = await prisma.semester.findMany({
      where: { userId },
      include: { subjects: true }
    });
    if (!semesters.length) {
      return res.status(400).json({ error: 'No semesters found' });
    }
    const result = aggregateCGPA(semesters);
    res.json(result);
  } catch (error) {
    console.error('Error calculating CGPA:', error);
    res.status(500).json({ error: 'Failed to calculate CGPA' });
  }
});

export default router;
