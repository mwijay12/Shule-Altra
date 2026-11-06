import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  ImageRun,
  BorderStyle,
  VerticalAlign,
  ShadingType
} from 'docx';
import type { ReportCardData } from '@/types/report';

/**
 * Institutional Excel Export Engine
 */
export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(blob, `${fileName}_2026.xlsx`);
}

/**
 * Fetches institutional logo as base64 for Word embedding
 */
async function fetchLogoAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Official Transcript Generation (Sovereign Hub Format)
 * Designed for High-Fidelity NECTA Alignment
 */
export async function exportReportCardToWord(data: ReportCardData) {
  const sections = [];
  const headerChildren = [];

  // 1. Professional Header Node
  if (data.school.logoUrl) {
    const b64 = await fetchLogoAsBase64(data.school.logoUrl);
    if (b64) {
      // Browser-safe base64 → bytes (Buffer is not available in the client bundle)
      const base64Payload = b64.split(',')[1] || '';
      const binaryString = atob(base64Payload);
      const buffer = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        buffer[index] = binaryString.charCodeAt(index);
      }
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: buffer, transformation: { width: 70, height: 70 } } as any)],
        })
      );
    }
  }

  headerChildren.push(
    new Paragraph({
      text: data.school.name.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "OFFICIAL ACADEMIC REPORT CARD", bold: true, size: 24, color: "1F5BA6" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { color: "E2E8F0", space: 10, style: BorderStyle.SINGLE, size: 6 } },
      children: [
        new TextRun({ 
          text: `Academic Year: ${data.school.academicYear} | Term: ${data.term} | Exam: ${data.examType}`, 
          size: 20, 
          color: "64748B" 
        }),
      ],
    })
  );

  // 2. Student Metadata Matrix
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TableBordersNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Student Name:", bold: true }), new TextRun({ text: ` ${data.student.name.toUpperCase()}`, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Student ID:", bold: true }), new TextRun({ text: ` ${data.student.id}` })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Academic Tier:", bold: true }), new TextRun({ text: ` ${data.student.class}` })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Residence:", bold: true }), new TextRun({ text: ` ${data.student.type.toUpperCase()}` })] })] }),
        ],
      }),
    ],
  });

  // 3. Subject Matrix
  const gradesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("SUBJECT NODE"),
          headerCell("SCORE"),
          headerCell("GRADE"),
          headerCell("POINTS"),
          headerCell("REMARK"),
        ],
      }),
      ...data.results.map((res, i) => new TableRow({
        children: [
          dataCell(res.subject, i),
          dataCell(`${res.score}%`, i, AlignmentType.RIGHT as any),
          dataCell(res.grade, i, AlignmentType.CENTER as any, true),
          dataCell(res.points.toString(), i, AlignmentType.CENTER as any),
          dataCell(res.remark.toUpperCase(), i),
        ],
      })),
    ],
  });

  // 4. Summary Hub
  const summaryBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    ...({ spacing: { before: 400 } } as any),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "EEF2FF", type: ShadingType.CLEAR, color: "auto" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 },
                children: [
                  new TextRun({ text: `Total Points: ${data.summary.totalPoints}  |  `, bold: true, size: 24 }),
                  new TextRun({ text: `Division: ${data.summary.division}  |  `, bold: true, size: 24, color: "1F5BA6" }),
                  new TextRun({ text: `Position: ${data.summary.position} of ${data.summary.totalInClass}`, bold: true, size: 24 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Average Score: ${data.summary.averageScore}%  |  Classification: ${data.summary.classification.toUpperCase()}`, size: 18, color: "64748B" })
                ]
              })
            ],
          }),
        ],
      }),
    ],
  });

  // 5. Final Synthesis
  const doc = new Document({
    sections: [{
      children: [
        ...headerChildren,
        new Paragraph({ text: "", spacing: { before: 200 } }),
        infoTable,
        new Paragraph({ text: "", spacing: { before: 400 } }),
        gradesTable,
        summaryBox,
        new Paragraph({ text: "", spacing: { before: 800 } }),
        new Paragraph({ children: [new TextRun({ text: "Class Teacher's Remark: ________________________________________________", size: 20 })] }),
        new Paragraph({ text: "", spacing: { before: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Head Teacher's Remark: ________________________________________________", size: 20 })] }),
        new Paragraph({ text: "", spacing: { before: 1000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Generated by Shule Altra — Altraware Technology", size: 16, color: "94A3B8" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Authentication Date: ${data.generatedAt.toLocaleDateString()}`, size: 14, color: "CBD5E1" }),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${data.student.name.replace(/\s/g, '_')}_Report_${data.term}_2025.docx`);
}

// Helper: Header Cell styling
function headerCell(text: string) {
  return new TableCell({
    shading: { fill: "1F5BA6", type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ 
      alignment: AlignmentType.CENTER, 
      children: [new TextRun({ text, color: "FFFFFF", bold: true, size: 18 })] 
    })],
  });
}

// Helper: Data Cell styling
function dataCell(text: string, index: number, align = AlignmentType.LEFT, bold = false) {
  return new TableCell({
    shading: { fill: index % 2 === 0 ? "FFFFFF" : "F8FAFC", type: ShadingType.CLEAR, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ 
      alignment: align, 
      children: [new TextRun({ text, size: 18, bold })] 
    })],
  });
}

const TableBordersNone = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE },
};
