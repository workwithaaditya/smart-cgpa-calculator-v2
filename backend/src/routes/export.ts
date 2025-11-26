/**
 * Export Routes - JSON and PDF reports
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { isAuthenticated } from '../middleware/auth.js';
import { aggregateSGPA, aggregateCGPA } from '../utils/calculations.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(isAuthenticated);

// GET JSON export of all semesters & subjects with computed metrics
router.get('/json', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const semesters = await prisma.semester.findMany({
      where: { userId },
      include: { subjects: true }
    });
    const cgpaData = aggregateCGPA(semesters);
    const semestersDetailed = semesters.map(sem => {
      const sgpaData = aggregateSGPA(sem.subjects);
      return {
        id: sem.id,
        name: sem.name,
        isActive: sem.isActive,
        ...sgpaData,
        subjects: sem.subjects.map(s => ({
          id: s.id,
            code: s.code,
            name: s.name,
            cie: s.cie,
            see: s.see,
            credits: s.credits,
            total: s.total,
            gp: s.gp,
            weighted: s.weighted
        }))
      };
    });
    res.json({ cgpa: cgpaData.cgpa, totalCredits: cgpaData.totalCredits, semesterBreakdown: cgpaData.semesterBreakdown, semesters: semestersDetailed });
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// GET PDF export summarizing CGPA and semester SGPA
router.get('/pdf', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const semesters = await prisma.semester.findMany({
      where: { userId },
      include: { subjects: true }
    });
    const cgpaData = aggregateCGPA(semesters);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cgpa-report.pdf"');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Smart CGPA Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Total Credits: ${cgpaData.totalCredits}`);
    doc.text(`CGPA: ${cgpaData.cgpa}`);
    doc.moveDown();
    doc.fontSize(16).text('Semester Breakdown');
    doc.moveDown(0.5);
    cgpaData.semesterBreakdown.forEach(sb => {
      doc.fontSize(14).text(`${sb.name} - Credits: ${sb.credits} | SGPA: ${sb.sgpa}`);
      const sem = semesters.find(s => s.id === sb.semesterId)!;
      sem.subjects.forEach(sub => {
        doc.fontSize(10).text(`  ${sub.code} ${sub.name} | Credits: ${sub.credits} | CIE: ${sub.cie} | SEE: ${sub.see} | GP: ${sub.gp ?? '-'} | Total: ${sub.total ?? '-'} `);
      });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

export default router;
