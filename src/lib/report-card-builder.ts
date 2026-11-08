'use client';

/**
 * @fileOverview Data Assembler for Shule Altra Report Cards.
 * Bridges Firestore data with NECTA logic.
 */

import { 
  getDoc, 
  getDocs, 
  doc, 
  collection, 
  query, 
  where, 
  limit,
  Firestore
} from 'firebase/firestore';
import { 
  getCSEEGrade, 
  getPSLEGrade, 
  calculateCSEEDivision, 
  calculateClassRankings,
  type SubjectGrade 
} from '@/lib/necta-logic';
import type { ReportCardData, SubjectResult } from '@/types/report';

/**
 * Assembles a complete ReportCardData object from Firestore.
 */
export async function buildReportCardData(
  db: Firestore,
  schoolId: string,
  studentId: string,
  term: string,
  examType: string
): Promise<ReportCardData> {
  try {
    // 1. Fetch school and student context
    const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
    const studentSnap = await getDoc(doc(db, 'schools', schoolId, 'students', studentId));

    if (!schoolSnap.exists() || !studentSnap.exists()) {
      throw new Error("School or student record not found.");
    }

    const schoolData = schoolSnap.data();
    const studentData = studentSnap.data();
    const schoolType = (schoolData.type || 'secondary') as 'primary' | 'secondary';

    // 2. Fetch grades
    const gradesQuery = query(
      collection(db, 'schools', schoolId, 'grades'),
      where('studentId', '==', studentId),
      where('term', '==', term),
      where('examType', '==', examType)
    );
    const gradesSnap = await getDocs(gradesQuery);

    // 3. Map Subject Results
    const subjectResults: SubjectResult[] = gradesSnap.docs.map(d => {
      const g = d.data();
      const necta = schoolType === 'secondary' 
        ? getCSEEGrade(g.score) 
        : getPSLEGrade(g.score);
      
      return {
        subject: g.subject,
        score: g.score,
        grade: necta.grade,
        points: necta.points,
        remark: necta.remark
      };
    });

    // 4. Calculate Summary Hub
    let division = 'N/A';
    let classification = 'No Data';
    let totalPoints = 0;
    
    if (subjectResults.length > 0) {
      if (schoolType === 'secondary') {
        const nectaSubjects: SubjectGrade[] = subjectResults.map(r => ({
          subject: r.subject,
          score: r.score,
          grade: r.grade,
          points: r.points
        }));
        
        try {
          const divResult = calculateCSEEDivision(nectaSubjects);
          division = divResult.division;
          totalPoints = divResult.totalPoints;
          classification = divResult.classification;
        } catch (e) {
          division = '0';
          classification = 'Incomplete Assessment';
        }
      } else {
        totalPoints = subjectResults.reduce((sum, r) => sum + r.points, 0);
        classification = 'Primary Level Grade';
      }
    }

    const averageScore = subjectResults.length > 0 
      ? subjectResults.reduce((sum, r) => sum + r.score, 0) / subjectResults.length 
      : 0;

    // 5. Ranking Audit
    // For demo efficiency, we limit to 100 students in the same class
    const peersQuery = query(
      collection(db, 'schools', schoolId, 'students'),
      where('class', '==', studentData.class),
      limit(100)
    );
    const peersSnap = await getDocs(peersQuery);
    
    const rankingsInput = await Promise.all(peersSnap.docs.map(async (pDoc) => {
      const p = pDoc.data();
      const pGradesQuery = query(
        collection(db, 'schools', schoolId, 'grades'),
        where('studentId', '==', pDoc.id),
        where('term', '==', term),
        where('examType', '==', examType)
      );
      const pGradesSnap = await getDocs(pGradesQuery);
      
      const pSubjects: SubjectGrade[] = pGradesSnap.docs.map(gd => {
        const g = gd.data();
        const n = schoolType === 'secondary' ? getCSEEGrade(g.score) : getPSLEGrade(g.score);
        return { subject: g.subject, score: g.score, grade: n.grade, points: n.points };
      });

      return {
        id: pDoc.id,
        name: p.name,
        subjects: pSubjects
      };
    }));

    const allRankings = calculateClassRankings(rankingsInput);
    const myRanking = allRankings.find(r => r.studentId === studentId);

    return {
      school: {
        name: schoolData.name || "School name not set",
        logoUrl: schoolData.logoUrl || null,
        academicYear: schoolData.academicYear || "2025",
        type: schoolType
      },
      student: {
        id: studentData.id,
        name: studentData.name,
        class: studentData.class,
        type: studentData.type || 'Day'
      },
      results: subjectResults,
      summary: {
        totalPoints,
        division,
        classification,
        position: myRanking?.rank || 0,
        totalInClass: allRankings.length,
        averageScore: Math.round(averageScore * 100) / 100
      },
      term,
      examType,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error("[REPORT_BUILDER] Failure:", error);
    throw error;
  }
}
