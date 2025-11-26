/**
 * Smart CGPA Calculator - Core Engine
 * 
 * This module implements all formulas and algorithms for SGPA calculation,
 * critical SEE computation, and intelligent planning strategies.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GradeBucket {
  min: number;  // Minimum total marks for this grade
  gp: number;   // Grade point value
  label?: string; // Optional label like 'O', 'A+', etc.
}

export interface Subject {
  code: string;
  name: string;
  cie: number;      // Internal marks (out of 50)
  see: number;      // Semester-end marks (out of 100)
  credits: number;
}

export interface SubjectResult {
  code: string;
  name: string;
  cie: number;
  see: number;
  seeScaled: number;  // SEE / 2
  total: number;      // CIE + SEE_scaled
  gp: number;         // Grade point
  weighted: number;   // GP × Credits
  credits: number;
}

export interface SGPAResult {
  subjects: SubjectResult[];
  sgpa: number;
  totalCredits: number;
  totalWeighted: number;
  maxSgpaIfAll100: number;
}

export interface CriticalSEE {
  cutoffTotal: number;  // The total marks cutoff (e.g., 90)
  seeCrit: number;      // SEE value needed to reach cutoff
  gp: number;           // GP at this cutoff
  reachable: boolean;   // Whether this cutoff is achievable
}

export interface SubjectPlan {
  code: string;
  name: string;
  currentSee: number;
  minSeeToReachTarget: number;
  achievedSgpa: number;
  possible: boolean;
  marginalGain: number; // SGPA gain per +1 SEE at current position
}

export interface GlobalPlanStep {
  code: string;
  name: string;
  fromSee: number;
  toSee: number;
  increaseSeeBy: number;
  sgpaAfter: number;
}

export interface GlobalPlan {
  steps: GlobalPlanStep[];
  finalSgpa: number;
  targetReached: boolean;
  bestAttainableSgpa: number;
}

export interface GradingConfig {
  maxCIE: number;
  maxSEE: number;
  buckets: GradeBucket[];
  roundingDigits: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  maxCIE: 50,
  maxSEE: 100,
  roundingDigits: 2,
  buckets: [
    { min: 90, gp: 10, label: 'O' },
    { min: 80, gp: 9, label: 'A+' },
    { min: 70, gp: 8, label: 'A' },
    { min: 60, gp: 7, label: 'B+' },
    { min: 50, gp: 6, label: 'B' },
    { min: 40, gp: 5, label: 'C' },
    { min: 0, gp: 4, label: 'F' }
  ]
};

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Scale SEE marks to internal scale
 * Formula: SEE_scaled = SEE / 2
 */
export function scaleSEE(see: number, config: GradingConfig = DEFAULT_GRADING_CONFIG): number {
  return see / (config.maxSEE / config.maxCIE);
}

/**
 * Calculate subject total
 * Formula: Total = CIE + SEE_scaled
 */
export function calculateTotal(cie: number, see: number, config: GradingConfig = DEFAULT_GRADING_CONFIG): number {
  const seeScaled = scaleSEE(see, config);
  return cie + seeScaled;
}

/**
 * Map total marks to grade point using bucket configuration
 * Returns GP based on piecewise grade cutoffs
 */
export function gpForTotal(total: number, config: GradingConfig = DEFAULT_GRADING_CONFIG): number {
  // Sort buckets by min descending to check from highest to lowest
  const sortedBuckets = [...config.buckets].sort((a, b) => b.min - a.min);
  
  for (const bucket of sortedBuckets) {
    if (total >= bucket.min) {
      return bucket.gp;
    }
  }
  
  // Fallback (should not reach here if buckets cover full range)
  return 0;
}

/**
 * Calculate weighted points for a subject
 * Formula: WeightedPoints = GP × Credits
 */
export function calculateWeightedPoints(gp: number, credits: number): number {
  return gp * credits;
}

/**
 * Calculate SGPA for all subjects
 * Formula: SGPA = (Σ WeightedPoints) / (Σ Credits)
 */
export function calculateSGPA(
  subjects: Subject[],
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): SGPAResult {
  const results: SubjectResult[] = subjects.map(subject => {
    const seeScaled = scaleSEE(subject.see, config);
    const total = subject.cie + seeScaled;
    const gp = gpForTotal(total, config);
    const weighted = calculateWeightedPoints(gp, subject.credits);
    
    return {
      code: subject.code,
      name: subject.name,
      cie: subject.cie,
      see: subject.see,
      seeScaled,
      total,
      gp,
      weighted,
      credits: subject.credits
    };
  });
  
  const totalCredits = results.reduce((sum, r) => sum + r.credits, 0);
  const totalWeighted = results.reduce((sum, r) => sum + r.weighted, 0);
  const sgpa = totalCredits > 0 ? totalWeighted / totalCredits : 0;
  
  // Calculate max SGPA if all subjects get SEE = 100
  const maxSubjects = subjects.map(s => ({ ...s, see: config.maxSEE }));
  const maxResults = maxSubjects.map(subject => {
    const seeScaled = scaleSEE(subject.see, config);
    const total = subject.cie + seeScaled;
    const gp = gpForTotal(total, config);
    return calculateWeightedPoints(gp, subject.credits);
  });
  const maxWeighted = maxResults.reduce((sum, w) => sum + w, 0);
  const maxSgpaIfAll100 = totalCredits > 0 ? maxWeighted / totalCredits : 0;
  
  return {
    subjects: results,
    sgpa: roundTo(sgpa, config.roundingDigits),
    totalCredits,
    totalWeighted,
    maxSgpaIfAll100: roundTo(maxSgpaIfAll100, config.roundingDigits)
  };
}

/**
 * Round a number to specified decimal places
 */
export function roundTo(value: number, digits: number): number {
  const multiplier = Math.pow(10, digits);
  return Math.round(value * multiplier) / multiplier;
}

// ============================================================================
// CRITICAL SEE CALCULATIONS
// ============================================================================

/**
 * Calculate critical SEE values for all grade cutoffs for a subject
 * Formula: SEE_crit = (cutoffTotal - CIE) × 2
 * 
 * Returns array of critical SEE markers showing what SEE is needed
 * to reach each grade level
 */
export function calculateCriticalSEEValues(
  cie: number,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): CriticalSEE[] {
  const criticals: CriticalSEE[] = [];
  
  for (const bucket of config.buckets) {
    const cutoffTotal = bucket.min;
    const seeCrit = (cutoffTotal - cie) * (config.maxSEE / config.maxCIE);
    const reachable = seeCrit >= 0 && seeCrit <= config.maxSEE;
    
    criticals.push({
      cutoffTotal,
      seeCrit: Math.max(0, Math.min(config.maxSEE, seeCrit)),
      gp: bucket.gp,
      reachable
    });
  }
  
  // Sort by SEE ascending
  return criticals.sort((a, b) => a.seeCrit - b.seeCrit);
}

/**
 * Calculate which grade band a given SEE falls into for a subject
 */
export function getGradeBandForSEE(
  cie: number,
  see: number,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): GradeBucket {
  const total = calculateTotal(cie, see, config);
  const gp = gpForTotal(total, config);
  
  const bucket = config.buckets.find(b => b.gp === gp);
  return bucket || config.buckets[config.buckets.length - 1];
}

// ============================================================================
// PLANNING ALGORITHMS
// ============================================================================

/**
 * Find minimal SEE for a single subject to reach target SGPA
 * 
 * Algorithm: Binary search over SEE range [currentSee, maxSEE]
 * Returns the minimal SEE value needed or -1 if impossible
 */
export function findMinimalSEEForTarget(
  subjects: Subject[],
  targetSubjectCode: string,
  targetSgpa: number,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): SubjectPlan {
  const targetIndex = subjects.findIndex(s => s.code === targetSubjectCode);
  if (targetIndex === -1) {
    throw new Error(`Subject ${targetSubjectCode} not found`);
  }
  
  const currentSubject = subjects[targetIndex];
  const currentSee = currentSubject.see;
  
  // Calculate current SGPA
  const currentResult = calculateSGPA(subjects, config);
  
  // Calculate marginal gain at current position
  const testSubjects = subjects.map((s, i) => 
    i === targetIndex ? { ...s, see: Math.min(s.see + 1, config.maxSEE) } : s
  );
  const testResult = calculateSGPA(testSubjects, config);
  const marginalGain = testResult.sgpa - currentResult.sgpa;
  
  // Check if target already met
  if (currentResult.sgpa >= targetSgpa) {
    return {
      code: currentSubject.code,
      name: currentSubject.name,
      currentSee,
      minSeeToReachTarget: currentSee,
      achievedSgpa: currentResult.sgpa,
      possible: true,
      marginalGain
    };
  }
  
  // Binary search for minimal SEE
  let left = currentSee;
  let right = config.maxSEE;
  let minSee = -1;
  let achievedSgpa = currentResult.sgpa;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const modifiedSubjects = subjects.map((s, i) => 
      i === targetIndex ? { ...s, see: mid } : s
    );
    const result = calculateSGPA(modifiedSubjects, config);
    
    if (result.sgpa >= targetSgpa) {
      minSee = mid;
      achievedSgpa = result.sgpa;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  return {
    code: currentSubject.code,
    name: currentSubject.name,
    currentSee,
    minSeeToReachTarget: minSee,
    achievedSgpa,
    possible: minSee !== -1,
    marginalGain
  };
}

/**
 * Greedy global planner: find sequence of SEE improvements to reach target SGPA
 * 
 * Algorithm:
 * 1. While SGPA < target and some SEE < maxSEE:
 * 2. For each subject, compute marginal gain if SEE increased by 1
 * 3. Pick subject with max marginal gain
 * 4. Jump to next critical SEE for that subject (or +1 if none)
 * 5. Repeat until target reached or all SEE = maxSEE
 * 
 * Note: This is a heuristic, not guaranteed optimal
 */
export function greedyGlobalPlan(
  subjects: Subject[],
  targetSgpa: number,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): GlobalPlan {
  const workingSubjects = subjects.map(s => ({ ...s }));
  const steps: GlobalPlanStep[] = [];
  
  let currentResult = calculateSGPA(workingSubjects, config);
  let iterations = 0;
  const maxIterations = 1000; // Safety limit
  
  while (currentResult.sgpa < targetSgpa && iterations < maxIterations) {
    iterations++;
    
    // Check if all subjects are at max SEE
    const allAtMax = workingSubjects.every(s => s.see >= config.maxSEE);
    if (allAtMax) break;
    
    // Calculate marginal gains for each subject
    let bestSubjectIndex = -1;
    let bestMarginalGain = 0;
    
    for (let i = 0; i < workingSubjects.length; i++) {
      if (workingSubjects[i].see >= config.maxSEE) continue;
      
      const testSubjects = workingSubjects.map((s, idx) => 
        idx === i ? { ...s, see: Math.min(s.see + 1, config.maxSEE) } : s
      );
      const testResult = calculateSGPA(testSubjects, config);
      const marginalGain = testResult.sgpa - currentResult.sgpa;
      
      if (marginalGain > bestMarginalGain) {
        bestMarginalGain = marginalGain;
        bestSubjectIndex = i;
      }
    }
    
    if (bestSubjectIndex === -1) break; // No improvement possible
    
    // Find next critical SEE or just increment by 1
    const subject = workingSubjects[bestSubjectIndex];
    const criticals = calculateCriticalSEEValues(subject.cie, config);
    const nextCritical = criticals.find(c => c.seeCrit > subject.see && c.reachable);
    
    const fromSee = subject.see;
    const toSee = nextCritical 
      ? Math.min(nextCritical.seeCrit, config.maxSEE)
      : Math.min(subject.see + 1, config.maxSEE);
    
    workingSubjects[bestSubjectIndex].see = toSee;
    currentResult = calculateSGPA(workingSubjects, config);
    
    steps.push({
      code: subject.code,
      name: subject.name,
      fromSee,
      toSee,
      increaseSeeBy: toSee - fromSee,
      sgpaAfter: currentResult.sgpa
    });
    
    // Early exit if target reached
    if (currentResult.sgpa >= targetSgpa) break;
  }
  
  // Calculate best attainable SGPA (all SEE = 100)
  const maxSubjects = subjects.map(s => ({ ...s, see: config.maxSEE }));
  const maxResult = calculateSGPA(maxSubjects, config);
  
  return {
    steps,
    finalSgpa: currentResult.sgpa,
    targetReached: currentResult.sgpa >= targetSgpa,
    bestAttainableSgpa: maxResult.sgpa
  };
}

// ============================================================================
// ADVANCED ANALYSIS
// ============================================================================

/**
 * Calculate marginal SGPA gain for each subject at current SEE
 * Used for Pareto analysis
 */
export function calculateMarginalGains(
  subjects: Subject[],
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): Array<{ code: string; name: string; marginalGain: number }> {
  const currentResult = calculateSGPA(subjects, config);
  
  return subjects.map((subject, index) => {
    if (subject.see >= config.maxSEE) {
      return { code: subject.code, name: subject.name, marginalGain: 0 };
    }
    
    const testSubjects = subjects.map((s, i) => 
      i === index ? { ...s, see: Math.min(s.see + 1, config.maxSEE) } : s
    );
    const testResult = calculateSGPA(testSubjects, config);
    const marginalGain = testResult.sgpa - currentResult.sgpa;
    
    return { 
      code: subject.code, 
      name: subject.name, 
      marginalGain: roundTo(marginalGain, config.roundingDigits + 2) 
    };
  });
}

/**
 * Generate SGPA curve for a subject across SEE range
 * Used for line charts showing SEE → SGPA relationship
 */
export function generateSGPACurve(
  subjects: Subject[],
  targetSubjectCode: string,
  step: number = 1,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): Array<{ see: number; sgpa: number; gp: number }> {
  const targetIndex = subjects.findIndex(s => s.code === targetSubjectCode);
  if (targetIndex === -1) return [];
  
  const curve: Array<{ see: number; sgpa: number; gp: number }> = [];
  
  for (let see = 0; see <= config.maxSEE; see += step) {
    const modifiedSubjects = subjects.map((s, i) => 
      i === targetIndex ? { ...s, see } : s
    );
    const result = calculateSGPA(modifiedSubjects, config);
    const total = calculateTotal(subjects[targetIndex].cie, see, config);
    const gp = gpForTotal(total, config);
    
    curve.push({ see, sgpa: result.sgpa, gp });
  }
  
  return curve;
}

/**
 * Generate 2D heatmap data: SGPA for pairs of subject SEE values
 */
export function generatePairwiseHeatmap(
  subjects: Subject[],
  subjectCodeA: string,
  subjectCodeB: string,
  step: number = 5,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): Array<{ seeA: number; seeB: number; sgpa: number }> {
  const indexA = subjects.findIndex(s => s.code === subjectCodeA);
  const indexB = subjects.findIndex(s => s.code === subjectCodeB);
  
  if (indexA === -1 || indexB === -1) return [];
  
  const heatmap: Array<{ seeA: number; seeB: number; sgpa: number }> = [];
  
  for (let seeA = 0; seeA <= config.maxSEE; seeA += step) {
    for (let seeB = 0; seeB <= config.maxSEE; seeB += step) {
      const modifiedSubjects = subjects.map((s, i) => {
        if (i === indexA) return { ...s, see: seeA };
        if (i === indexB) return { ...s, see: seeB };
        return s;
      });
      const result = calculateSGPA(modifiedSubjects, config);
      heatmap.push({ seeA, seeB, sgpa: result.sgpa });
    }
  }
  
  return heatmap;
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export configuration and results as JSON
 */
export function exportToJSON(
  subjects: Subject[],
  result: SGPAResult,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): string {
  return JSON.stringify({
    config,
    subjects,
    result,
    timestamp: new Date().toISOString()
  }, null, 2);
}

/**
 * Validate subject data
 */
export function validateSubject(
  subject: Subject,
  config: GradingConfig = DEFAULT_GRADING_CONFIG
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (subject.cie < 0 || subject.cie > config.maxCIE) {
    errors.push(`CIE must be between 0 and ${config.maxCIE}`);
  }
  if (subject.see < 0 || subject.see > config.maxSEE) {
    errors.push(`SEE must be between 0 and ${config.maxSEE}`);
  }
  if (subject.credits <= 0) {
    errors.push('Credits must be positive');
  }
  if (!subject.code || !subject.name) {
    errors.push('Subject code and name are required');
  }
  
  return { valid: errors.length === 0, errors };
}
