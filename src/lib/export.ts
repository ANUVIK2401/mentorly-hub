/**
 * Excel export. Ben has not specified exact columns yet (docs/DECISIONS.md, Q9):
 * edit APPLICATION_COLUMNS below and the workbook follows. Nothing else needs to change.
 *
 * Security note: student text is written as plain string cells, never formulas, so values
 * that start with "=" are NOT executed by Excel. If you ever add CSV export, prefix such
 * values with a quote to avoid CSV formula injection.
 */
import ExcelJS from "exceljs";
import { APPLICATION_STATUS_LABEL, COHORT_STATUS_LABEL } from "@/lib/format";
import type { AdminApplicationRow, AdminCohortRow } from "@/data/types";

interface Column<T> {
  header: string;
  width: number;
  value: (row: T) => string | number | Date;
  numFmt?: string;
}

export const APPLICATION_COLUMNS: Column<AdminApplicationRow>[] = [
  { header: "Application ID", width: 38, value: (r) => r.id },
  { header: "Submitted (UTC)", width: 20, value: (r) => new Date(r.submittedAt), numFmt: "yyyy-mm-dd hh:mm" },
  { header: "Status", width: 14, value: (r) => APPLICATION_STATUS_LABEL[r.status] },
  { header: "Student name", width: 24, value: (r) => r.student.name },
  { header: "Email", width: 34, value: (r) => r.student.email },
  { header: "School", width: 30, value: (r) => r.student.school },
  { header: "Program", width: 28, value: (r) => r.student.program },
  { header: "Graduation year", width: 16, value: (r) => r.student.graduationYear },
  { header: "Project", width: 52, value: (r) => r.projectTitle },
  { header: "Instructor", width: 22, value: (r) => r.instructorName },
  { header: "Cohort start", width: 14, value: (r) => new Date(`${r.cohortStart}T00:00:00Z`), numFmt: "yyyy-mm-dd" },
  { header: "Statement", width: 70, value: (r) => r.statement },
];

export const COHORT_COLUMNS: Column<AdminCohortRow>[] = [
  { header: "Project", width: 52, value: (r) => r.projectTitle },
  { header: "Instructor", width: 22, value: (r) => r.instructorName },
  { header: "Start", width: 14, value: (r) => new Date(`${r.startDate}T00:00:00Z`), numFmt: "yyyy-mm-dd" },
  { header: "Application deadline", width: 20, value: (r) => new Date(`${r.applicationDeadline}T00:00:00Z`), numFmt: "yyyy-mm-dd" },
  { header: "Status", width: 20, value: (r) => COHORT_STATUS_LABEL[r.status] },
  { header: "Capacity", width: 10, value: (r) => r.maxStudents },
  { header: "Seats taken", width: 12, value: (r) => r.seatsTaken },
  { header: "Applications", width: 13, value: (r) => r.applicationCount },
  { header: "Waitlist", width: 10, value: (r) => r.waitlistCount },
];

function addSheet<T>(wb: ExcelJS.Workbook, name: string, columns: Column<T>[], rows: T[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  for (const row of rows) ws.addRow(columns.map((c) => c.value(row)));

  columns.forEach((c, i) => {
    if (c.numFmt) ws.getColumn(i + 1).numFmt = c.numFmt;
  });
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B5D4B" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

export async function buildWorkbook(applications: AdminApplicationRow[], cohorts: AdminCohortRow[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mentorly Hub";
  wb.created = new Date();
  addSheet(wb, "Applications", APPLICATION_COLUMNS, applications);
  addSheet(wb, "Cohort capacity", COHORT_COLUMNS, cohorts);
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
