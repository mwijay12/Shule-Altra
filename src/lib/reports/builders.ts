/**
 * @fileOverview Pure report payload builders for the Reports centre.
 *
 * Keeping the data → document mapping outside React means every report can be
 * generated headlessly (see `npm run demo:pdf`) and verified in CI, instead of
 * relying on a human clicking buttons in a browser.
 */

import type { TabularReportInput } from '@/lib/pdf/tabular-report';
import { formatDate } from '@/lib/pdf/tabular-report';

export interface ReportData {
  learners: any[];
  ledger: any[];
  gradeRows: any[];
  attendanceRows: any[];
  petty: any[];
  canteen: any[];
  assets: any[];
  staff: any[];
  perLearnerScores: Array<{
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    average: number;
    division: string;
    balance: number;
  }>;
  collectionRate: number;
}

export function buildPerLearnerScores(learners: any[], gradeRows: any[]) {
  const totals = new Map<string, { total: number; count: number }>();
  gradeRows.forEach((row) => {
    if (!row?.studentId) return;
    const current = totals.get(row.studentId) ?? { total: 0, count: 0 };
    current.total += Number(row.score ?? 0);
    current.count += 1;
    totals.set(row.studentId, current);
  });
  return learners
    .map((learner) => {
      const stat = totals.get(learner.id);
      const average = stat && stat.count > 0 ? stat.total / stat.count : 0;
      return {
        id: learner.id,
        name: learner.name ?? 'Unnamed learner',
        admissionNumber: learner.admissionNumber ?? learner.id,
        className: learner.className ?? learner.class ?? 'Unassigned',
        average,
        division: average >= 75 ? 'I' : average >= 65 ? 'II' : average >= 55 ? 'III' : average >= 45 ? 'IV' : 'V',
        balance: Number(learner.balance ?? 0),
      };
    })
    .filter((row) => row.average > 0)
    .sort((a, b) => b.average - a.average);
}

export function buildAttendanceRows(learners: any[], attendanceRows: any[]) {
  return learners.map((learner) => {
    const entries = attendanceRows.filter((row) => row.studentId === learner.id);
    const present = entries.filter((row) => row.status === 'Present').length;
    const late = entries.filter((row) => row.status === 'Late').length;
    const absent = entries.filter((row) => row.status === 'Absent').length;
    const total = entries.length;
    return {
      admissionNumber: learner.admissionNumber ?? learner.id,
      name: learner.name ?? 'Unnamed',
      className: learner.className ?? 'Unassigned',
      present,
      late,
      absent,
      rate: total > 0 ? (present / total) * 100 : 0,
    };
  });
}

/** Stable reference for a given report + day. */
export function reportReference(id: string, date = new Date()) {
  return `RPT-${id.toUpperCase().replace(/-/g, '')}-${date.toISOString().slice(0, 10).replace(/-/g, '')}`;
}

const SUBJECT_CODES: Record<string, string> = {
  Mathematics: 'MATH',
  English: 'ENG',
  'English Language': 'ENG',
  Kiswahili: 'KISW',
  Physics: 'PHY',
  Chemistry: 'CHEM',
  Biology: 'BIO',
  Geography: 'GEO',
  History: 'HIST',
  Civics: 'CIV',
  Commerce: 'COMM',
  Bookkeeping: 'BKPG',
  Science: 'SCI',
  Social: 'SOC',
  'Social Studies': 'SOC',
};

export function buildReportPayload(id: string, data: ReportData): TabularReportInput | null {
  const meta = [
    { label: "Institution", value: "Shule Altra Secondary School" },
    { label: "Cohort", value: `${data.learners.length} learners` },
    { label: "Term", value: "Term 2 · 2026" },
    { label: "Generated", value: new Date().toLocaleDateString("en-GB") },
    { label: "Prepared by", value: "Institutional Registry" },
    { label: "Currency", value: "TZS" },
  ];
  const reference = reportReference(id);

  switch (id) {
    case "fee-ledger": {
      const collected = data.ledger
        .filter((row) => row.status !== "Pending" && row.status !== "Failed")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const pending = data.ledger
        .filter((row) => row.status === "Pending")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      return {
        title: "Fee collection ledger",
        subtitle: "Every captured payment · Term 2 · 2026",
        reference,
        meta,
        summary: [
          { label: "Verified value", value: `TZS ${collected.toLocaleString("en-US")}`, tone: "good" },
          { label: "Awaiting verification", value: `TZS ${pending.toLocaleString("en-US")}`, tone: "warn" },
          { label: "Receipts in window", value: `${data.ledger.length}`, tone: "neutral" },
        ],
        sections: [
          {
            title: "Ledger entries",
            compact: true,
            columns: [
              { key: "date", header: "Date", width: 54 },
              { key: "reference", header: "Reference", width: 92 },
              { key: "learner", header: "Learner", width: 110 },
              { key: "klass", header: "Class", width: 50 },
              { key: "method", header: "Method", width: 66 },
              { key: "status", header: "Status", width: 52 },
              { key: "amount", header: "Amount", width: 70, align: "right" as const },
            ],
            rows: data.ledger.map((row) => ({
              date: formatDate(row.createdAt),
              reference: row.transactionReference ?? row.controlNumber ?? row.id ?? "—",
              learner: row.studentName ?? "—",
              klass: row.class ?? row.metadata?.class ?? "—",
              method: row.paymentMethod ?? "Control number",
              status: row.status ?? "Verified",
              amount: `TZS ${Number(row.amount ?? 0).toLocaleString("en-US")}`,
            })),
            note: "Entries marked Pending are captured but not yet confirmed by the gateway.",
          },
        ],
        declaration: [
          "Totals are derived from the institutional ledger at the moment of generation.",
          "Disputed entries remain flagged until a bank statement is attached.",
        ],
        signatures: [
          { role: "Bursar", name: "J. Mwakalinga" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    case "expenditure": {
      const rows = ((data.petty || []) as any[]).map((row) => ({
        date: formatDate(row.date ?? row.createdAt),
        description: row.description ?? row.category ?? "—",
        department: row.department ?? "—",
        category: row.category ?? "—",
        status: row.status ?? "Pending",
        amount: `TZS ${Number(row.amount ?? 0).toLocaleString("en-US")}`,
      }));
      const approved = ((data.petty || []) as any[])
        .filter((row) => row.status === "Approved")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const pending = ((data.petty || []) as any[])
        .filter((row) => row.status === "Pending")
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      return {
        title: "Legacy petty-cash requests",
        subtitle: "Up to 200 older requests · separate from recorded expenses",
        reference,
        meta,
        summary: [
          { label: "Approved spend", value: `TZS ${approved.toLocaleString("en-US")}`, tone: "bad" },
          { label: "Pending approval", value: `TZS ${pending.toLocaleString("en-US")}`, tone: "warn" },
          { label: "Requests", value: `${rows.length}`, tone: "neutral" },
        ],
        sections: [
          {
            title: "Expenditure register",
            compact: true,
            columns: [
              { key: "date", header: "Date", width: 58 },
              { key: "description", header: "Description", width: 150 },
              { key: "department", header: "Department", width: 80 },
              { key: "category", header: "Category", width: 66 },
              { key: "status", header: "Status", width: 54 },
              { key: "amount", header: "Amount", width: 70, align: "right" as const },
            ],
            rows,
          },
        ],
        declaration: ["Legacy requests only; not a cash balance or proof of payment. New recorded expenses are in a separate report."],
        signatures: [
          { role: "Prepared by", name: "________________" },
          { role: "Reviewed by", name: "________________" },
        ],
      };
    }

    case "defaulters": {
      const defaulters = data.learners
        .filter((learner) => Number(learner.balance ?? 0) > 0)
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0));
      const total = defaulters.reduce((sum, learner) => sum + Number(learner.balance ?? 0), 0);
      return {
        title: "Fee defaulters register",
        subtitle: "Outstanding balances · recovery action list",
        reference,
        meta,
        summary: [
          { label: "Total outstanding", value: `TZS ${total.toLocaleString("en-US")}`, tone: "bad" },
          { label: "Learners in arrears", value: `${defaulters.length}`, tone: "warn" },
          { label: "Collection rate", value: `${data.collectionRate}%`, tone: data.collectionRate >= 70 ? "good" : "warn" },
        ],
        sections: [
          {
            title: "Recovery list",
            compact: true,
            columns: [
              { key: "admission", header: "Admission no.", width: 78 },
              { key: "learner", header: "Learner", width: 140 },
              { key: "klass", header: "Class", width: 54 },
              { key: "billed", header: "Billed", width: 66, align: "right" as const },
              { key: "paid", header: "Paid", width: 66, align: "right" as const },
              { key: "balance", header: "Balance", width: 70, align: "right" as const },
              { key: "status", header: "Severity", width: 58 },
            ],
            rows: defaulters.map((learner) => {
              const balance = Number(learner.balance ?? 0);
              return {
                admission: learner.admissionNumber ?? learner.id,
                learner: learner.name ?? "—",
                klass: learner.className ?? learner.class ?? "—",
                billed: `TZS ${Number(learner.totalFeesExpected ?? learner.feeStructure ?? balance).toLocaleString("en-US")}`,
                paid: `TZS ${Number(learner.totalPaid ?? 0).toLocaleString("en-US")}`,
                balance: `TZS ${balance.toLocaleString("en-US")}`,
                status: balance >= 300000 ? "Critical" : balance >= 100000 ? "Partial" : "Watch",
              };
            }),
          },
        ],
        declaration: [
          "Guardians should be contacted within seven days of the issue date.",
          "A statement of account is issued alongside this register on request.",
        ],
        signatures: [
          { role: "Bursar", name: "J. Mwakalinga" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    case "subject-analysis": {
      const bySubject = new Map<string, number[]>();
      data.gradeRows.forEach((row) => {
        const subject = row.subject ?? "Unassigned";
        const list = bySubject.get(subject) ?? [];
        list.push(Number(row.score ?? 0));
        bySubject.set(subject, list);
      });
      const rows = Array.from(bySubject.entries())
        .map(([subject, scores]) => {
          const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          const passed = scores.filter((score) => score >= 45).length;
          return {
            subject,
            entries: `${scores.length}`,
            mean: `${mean.toFixed(1)}%`,
            passRate: `${((passed / scores.length) * 100).toFixed(1)}%`,
            best: `${Math.max(...scores)}%`,
            weakest: `${Math.min(...scores)}%`,
            rating: mean >= 70 ? "Strong" : mean >= 55 ? "Stable" : "Needs support",
          };
        })
        .sort((a, b) => parseFloat(b.mean) - parseFloat(a.mean));
      const overall =
        data.gradeRows.length > 0
          ? data.gradeRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / data.gradeRows.length
          : 0;
      return {
        title: "Subject performance matrix",
        subtitle: `${data.gradeRows.length} assessment records analysed`,
        reference,
        meta,
        summary: [
          { label: "Institutional mean", value: `${overall.toFixed(1)}%`, tone: overall >= 65 ? "good" : "warn" },
          { label: "Subjects assessed", value: `${rows.length}`, tone: "neutral" },
          {
            label: "Pass rate (≥45%)",
            value: `${((data.gradeRows.filter((row) => Number(row.score) >= 45).length / Math.max(1, data.gradeRows.length)) * 100).toFixed(1)}%`,
            tone: "good",
          },
        ],
        sections: [
          {
            title: "Subject breakdown",
            columns: [
              { key: "subject", header: "Subject", width: 130 },
              { key: "entries", header: "Entries", width: 46, align: "right" as const },
              { key: "mean", header: "Mean", width: 48, align: "right" as const },
              { key: "passRate", header: "Pass rate", width: 56, align: "right" as const },
              { key: "best", header: "Best", width: 42, align: "right" as const },
              { key: "weakest", header: "Lowest", width: 46, align: "right" as const },
              { key: "rating", header: "Rating", width: 66 },
            ],
            rows,
          },
        ],
        signatures: [
          { role: "Academic master", name: "S. Kimaro" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    case "master-sheet": {
      const subjects = Array.from(
        new Set(data.gradeRows.map((row) => row.subject).filter(Boolean))
      ).sort() as string[];
      const scoreMap = new Map<string, number>();
      data.gradeRows.forEach((row) => {
        const key = `${row.studentId}::${row.subject}`;
        const existing = scoreMap.get(key);
        if (existing === undefined || Number(row.score) > existing) {
          scoreMap.set(key, Number(row.score ?? 0));
        }
      });
      const rows = data.perLearnerScores.map((learner) => {
        const row: Record<string, string> = {
          admission: learner.admissionNumber,
          learner: learner.name,
          average: `${learner.average.toFixed(1)}%`,
          division: learner.division,
        };
        subjects.forEach((subject) => {
          const score = scoreMap.get(`${learner.id}::${subject}`);
          row[`s_${subject}`] = score === undefined ? "—" : `${Math.round(score)}`;
        });
        return row;
      });
      return {
        title: "Master grade sheet",
        subtitle: `${data.perLearnerScores.length} learners · ${subjects.length} subjects · Term 2 2026`,
        reference,
        orientation: "landscape",
        meta: [
          { label: "Institution", value: "Shule Altra Secondary School" },
          { label: "Exam", value: "Annual · Term 2" },
          { label: "Subjects", value: `${subjects.length}` },
          { label: "Learners", value: `${data.perLearnerScores.length}` },
          { label: "Generated", value: new Date().toLocaleDateString("en-GB") },
          { label: "Grading", value: "NECTA CSEE" },
        ],
        sections: [
          {
            title: "Consolidated marks",
            compact: true,
            columns: [
              { key: "admission", header: "Admission", width: 70 },
              { key: "learner", header: "Learner", width: 108 },
              ...subjects.map((subject) => ({
                key: `s_${subject}`,
                header: subject.slice(0, 9),
                width: 44,
                align: "center" as const,
              })),
              { key: "average", header: "Avg", width: 40, align: "right" as const },
              { key: "division", header: "Div", width: 30, align: "center" as const },
            ],
            rows,
            note: "Scores shown are the highest recorded attempt per subject.",
          },
        ],
        signatures: [
          { role: "Academic master", name: "S. Kimaro" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    case "canteen-log": {
      const sales = (data.canteen || []) as any[];
      const total = sales.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      return {
        title: "Canteen usage log",
        subtitle: "Cashless wallet sales · dietary consumption",
        reference,
        meta,
        summary: [
          { label: "Revenue in window", value: `TZS ${total.toLocaleString("en-US")}`, tone: "good" },
          { label: "Transactions", value: `${sales.length}`, tone: "neutral" },
          {
            label: "Average basket",
            value: `TZS ${Math.round(total / Math.max(1, sales.length)).toLocaleString("en-US")}`,
            tone: "neutral",
          },
        ],
        sections: [
          {
            title: "Sales stream",
            compact: true,
            columns: [
              { key: "date", header: "Date", width: 58 },
              { key: "learner", header: "Learner", width: 130 },
              { key: "item", header: "Item", width: 110 },
              { key: "amount", header: "Amount", width: 70, align: "right" as const },
              { key: "recordedBy", header: "Recorded by", width: 70 },
            ],
            rows: sales.map((row) => ({
              date: formatDate(row.createdAt),
              learner: row.studentName ?? "—",
              item: row.item ?? "—",
              amount: `TZS ${Number(row.amount ?? 0).toLocaleString("en-US")}`,
              recordedBy: row.recordedBy ?? "Canteen",
            })),
          },
        ],
        signatures: [
          { role: "Canteen manager", name: "M. Salum" },
          { role: "Bursar", name: "J. Mwakalinga" },
        ],
      };
    }

    case "asset-register": {
      const items = (data.assets || []) as any[];
      const value = items.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
      return {
        title: "Asset register",
        subtitle: "Verified institutional property",
        reference,
        meta,
        summary: [
          { label: "Book value", value: `TZS ${value.toLocaleString("en-US")}`, tone: "neutral" },
          { label: "Assets tracked", value: `${items.length}`, tone: "good" },
          {
            label: "Needs attention",
            value: `${items.filter((row) => row.condition === "Needs Repair" || row.status === "Under Maintenance").length}`,
            tone: "warn",
          },
        ],
        sections: [
          {
            title: "Property ledger",
            compact: true,
            columns: [
              { key: "tag", header: "Asset tag", width: 74 },
              { key: "name", header: "Asset", width: 130 },
              { key: "category", header: "Category", width: 66 },
              { key: "location", header: "Location", width: 80 },
              { key: "condition", header: "Condition", width: 60 },
              { key: "status", header: "Status", width: 70 },
              { key: "value", header: "Value", width: 70, align: "right" as const },
            ],
            rows: items.map((row) => ({
              tag: row.assetTag ?? "—",
              name: row.name ?? "—",
              category: row.category ?? "—",
              location: row.location ?? "—",
              condition: row.condition ?? "—",
              status: row.status ?? "Operational",
              value: `TZS ${Number(row.value ?? 0).toLocaleString("en-US")}`,
            })),
          },
        ],
        signatures: [
          { role: "Store keeper", name: "H. Mwanri" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    case "staff-attendance": {
      const people = (data.staff || []) as any[];
      const active = people.filter((row) => row.active !== false);
      return {
        title: "Staff establishment summary",
        subtitle: `${people.length} staff · ${active.length} active`,
        reference,
        meta,
        summary: [
          { label: "Active staff", value: `${active.length}`, tone: "good" },
          { label: "Departments", value: `${new Set(people.map((row) => row.department)).size}`, tone: "neutral" },
          { label: "Inactive", value: `${people.length - active.length}`, tone: "warn" },
        ],
        sections: [
          {
            title: "Personnel roster",
            compact: true,
            columns: [
              { key: "staffNo", header: "Staff no.", width: 78 },
              { key: "name", header: "Name", width: 128 },
              { key: "role", header: "Role", width: 66 },
              { key: "department", header: "Department", width: 76 },
              { key: "phone", header: "Phone", width: 84 },
              { key: "status", header: "Status", width: 56 },
            ],
            rows: people.map((row) => ({
              staffNo: row.staffNo ?? "—",
              name: row.fullName ?? "Unnamed",
              role: row.role ?? "—",
              department: row.department ?? "—",
              phone: row.phone ?? "—",
              status: row.active === false ? "Inactive" : "Active",
            })),
          },
        ],
        signatures: [
          { role: "Human resources", name: "R. Msuya" },
          { role: "Head of school", name: "Dr. A. Mushi" },
        ],
      };
    }

    default:
      return null;
  }
};


