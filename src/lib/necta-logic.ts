/**
 * @fileOverview National Grading Matrix Engine for Shule Altra.
 * Refined to align with official NECTA CSEE/ACSEE/PSLE/FTNA standards.
 */

export type NectaLevel = 'PSLE' | 'FTNA' | 'CSEE' | 'ACSEE';

export interface GradeResult {
  grade: string;
  points: number;
  remark: string;
}

export interface DivisionResult {
  division: string;
  totalPoints: number;
  bestSubjects: SubjectGrade[];
  classification: string;
}

export interface SubjectGrade {
  subject: string;
  score: number;
  grade: string;
  points: number;
}

// ── CSEE (Form IV) Grading Scale ──
export function calculateCseeGrade(score: number): GradeResult {
  if (score < 0 || score > 100) throw new Error(`Invalid score: ${score}`);
  if (score >= 75) return { grade: 'A', points: 1, remark: 'Excellent' };
  if (score >= 65) return { grade: 'B', points: 2, remark: 'Very Good' };
  if (score >= 45) return { grade: 'C', points: 3, remark: 'Good' };
  if (score >= 30) return { grade: 'D', points: 4, remark: 'Satisfactory' };
  return { grade: 'F', points: 5, remark: 'Fail' };
}

// Alias for consistency with other parts of the app
export const getCSEEGrade = calculateCseeGrade;

// ── ACSEE (Form VI) Grading Scale ──
export function calculateAcseeGrade(score: number): GradeResult {
  if (score >= 80) return { grade: 'A', points: 1, remark: 'Excellent' };
  if (score >= 70) return { grade: 'B', points: 2, remark: 'Very Good' };
  if (score >= 60) return { grade: 'C', points: 3, remark: 'Good' };
  if (score >= 50) return { grade: 'D', points: 4, remark: 'Satisfactory' };
  if (score >= 40) return { grade: 'E', points: 5, remark: 'Pass' };
  if (score >= 35) return { grade: 'S', points: 6, remark: 'Subsidiary' };
  return { grade: 'F', points: 7, remark: 'Fail' };
}

// ── PSLE (Standard VII) Grading Scale ──
export function calculatePsleGrade(score: number): GradeResult {
  if (score >= 41) return { grade: 'A', points: 1, remark: 'Excellent' };
  if (score >= 31) return { grade: 'B', points: 2, remark: 'Very Good' };
  if (score >= 21) return { grade: 'C', points: 3, remark: 'Average' };
  if (score >= 11) return { grade: 'D', points: 4, remark: 'Below Average' };
  return { grade: 'E', points: 5, remark: 'Fail' };
}

// Alias for consistency
export const getPSLEGrade = calculatePsleGrade;

// ── FTNA (Form II) pass/fail ──
export function calculateFtnaResult(subjects: SubjectGrade[]) {
  const failedCount = subjects.filter(s => s.score < 30).length;
  const avg = subjects.reduce((s, c) => s + c.score, 0) / subjects.length;
  const passed = failedCount <= 2 && avg >= 30;
  return { passed, avg: Math.round(avg), remark: passed ? 'PROCEED' : 'REMEDIAL' };
}

// ── Division classification (best 7 subjects) ──
const COMPULSORY_CSEE = ['Mathematics', 'English', 'Civics'];

export function classifyCseeDivision(subjects: SubjectGrade[]): DivisionResult {
  if (subjects.length < 7) {
    return { division: '0', totalPoints: 0, bestSubjects: [], classification: 'Incomplete' };
  }

  const compulsory = subjects.filter(s => COMPULSORY_CSEE.includes(s.subject));
  const optional = subjects.filter(s => !COMPULSORY_CSEE.includes(s.subject)).sort((a, b) => a.points - b.points);
  
  const best7 = [...compulsory, ...optional.slice(0, 4)];
  const points = best7.reduce((s, c) => s + c.points, 0);

  let div = '0';
  if (points >= 7 && points <= 17) div = 'I';
  else if (points >= 18 && points <= 21) div = 'II';
  else if (points >= 22 && points <= 25) div = 'III';
  else if (points >= 26 && points <= 33) div = 'IV';

  return { division: div, totalPoints: points, bestSubjects: best7, classification: `Division ${div}` };
}

// Alias for consistency
export const calculateCSEEDivision = classifyCseeDivision;

/**
 * Calculates rankings for a list of students based on their grades.
 */
export function calculateClassRankings(
  students: Array<{
    id: string;
    name: string;
    subjects: SubjectGrade[];
  }>
) {
  const rankings = students.map(student => {
    const totalScore = student.subjects.reduce((sum, s) => sum + s.score, 0);
    const averageScore = student.subjects.length > 0 ? Math.round((totalScore / student.subjects.length) * 10) / 10 : 0;
    const totalPoints = student.subjects.reduce((sum, s) => sum + s.points, 0);
    
    let division = '0';
    try {
        const divRes = classifyCseeDivision(student.subjects);
        division = divRes.division;
    } catch (e) {
        division = 'N/A';
    }

    return {
      studentId: student.id,
      studentName: student.name,
      totalPoints,
      averageScore,
      division,
      rank: 0,
    };
  });

  // Sort by average score descending
  rankings.sort((a, b) => b.averageScore - a.averageScore);
  
  // Assign ranks handling ties
  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0 && rankings[i].averageScore === rankings[i - 1].averageScore) {
      rankings[i].rank = rankings[i - 1].rank;
    } else {
      rankings[i].rank = currentRank;
    }
    currentRank = i + 1;
  }

  return rankings;
}

/**
 * Analyzes subject performance for a group of grades.
 */
export function analyzeSubjectPerformance(grades: SubjectGrade[]) {
  const totalStudents = grades.length;
  if (totalStudents === 0) return { totalStudents: 0, averageScore: 0, passRate: 0, gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 } };

  const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
  const averageScore = Math.round((totalScore / totalStudents) * 10) / 10;
  
  const passed = grades.filter(g => g.points <= 4).length; // D or better is a pass
  const passRate = Math.round((passed / totalStudents) * 100);

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  grades.forEach(g => {
    if (g.grade in gradeDistribution) {
        gradeDistribution[g.grade as keyof typeof gradeDistribution]++;
    }
  });

  return {
    totalStudents,
    averageScore,
    passRate,
    gradeDistribution,
  };
}
