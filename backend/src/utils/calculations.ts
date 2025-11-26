/**
 * Calculation utilities for SGPA/CGPA and subject metric caching.
 */
import { Subject, Semester } from '@prisma/client';

export interface ComputedSubjectMetrics {
  total: number; // cie + see_scaled
  gp: number; // grade point
  weighted: number; // gp * credits
}

export function scaleSee(see: number): number {
  return see / 2; // SEE out of 100 scaled to 50
}

export function getGradePoint(total: number): number {
  if (total >= 90) return 10;
  if (total >= 80) return 9;
  if (total >= 70) return 8;
  if (total >= 60) return 7;
  if (total >= 50) return 6;
  if (total >= 40) return 5;
  return 4;
}

export function computeSubjectMetrics(cie: number, see: number, credits: number): ComputedSubjectMetrics {
  const total = cie + scaleSee(see);
  const gp = getGradePoint(total);
  const weighted = gp * credits;
  return { total, gp, weighted };
}

export function aggregateSGPA(subjects: Pick<Subject, 'credits' | 'cie' | 'see'>[]): { sgpa: number; totalCredits: number; totalWeighted: number; maxSgpaIfAll100: number } {
  const detailed = subjects.map(s => {
    const { gp, weighted } = computeSubjectMetrics(s.cie, s.see, s.credits);
    return { gp, weighted, credits: s.credits };
  });
  const totalCredits = detailed.reduce((a, b) => a + b.credits, 0);
  const totalWeighted = detailed.reduce((a, b) => a + b.weighted, 0);
  const sgpa = totalCredits ? totalWeighted / totalCredits : 0;

  // Max SGPA if SEE = 100 for all
  const maxWeighted = subjects.reduce((sum, s) => {
    const maxTotal = s.cie + scaleSee(100);
    const maxGp = getGradePoint(maxTotal);
    return sum + maxGp * s.credits;
  }, 0);
  const maxSgpaIfAll100 = totalCredits ? maxWeighted / totalCredits : 0;
  return { sgpa: round2(sgpa), totalCredits, totalWeighted: round2(totalWeighted), maxSgpaIfAll100: round2(maxSgpaIfAll100) };
}

export function aggregateCGPA(semesters: (Semester & { subjects: Subject[] })[]): { cgpa: number; totalCredits: number; semesterBreakdown: { semesterId: string; name: string; sgpa: number; credits: number }[] } {
  const semesterBreakdown = semesters.map(sem => {
    const { sgpa, totalCredits } = aggregateSGPA(sem.subjects);
    return { semesterId: sem.id, name: sem.name, sgpa, credits: totalCredits };
  });
  const totalCredits = semesterBreakdown.reduce((a, b) => a + b.credits, 0);
  const weightedSum = semesterBreakdown.reduce((a, b) => a + b.sgpa * b.credits, 0);
  const cgpa = totalCredits ? weightedSum / totalCredits : 0;
  return { cgpa: round2(cgpa), totalCredits, semesterBreakdown };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export default {
  scaleSee,
  getGradePoint,
  computeSubjectMetrics,
  aggregateSGPA,
  aggregateCGPA
};
