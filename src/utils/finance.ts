import { Bill, Payment, StudentBill, StudentDebt } from '../api/types';

/** Money arrives as decimal strings or (for debts) float numbers; this reads either safely. */
export function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function fullName(s: { fname: string; mname?: string | null; lname: string }): string {
  return [s.fname, s.mname, s.lname].filter(Boolean).join(' ');
}

export interface DebtLine {
  billId: number;
  billName: string;
  sem: string;
  price: number;
  paid: number;
  owing: number;
}

export interface StudentDebtSummary {
  key: string;
  studentId?: string;
  name: string;
  grade: string;
  lines: DebtLine[];
  totalPrice: number;
  totalPaid: number;
  totalOwing: number;
}

const debtKey = (d: StudentDebt) =>
  d.admission_no || d.AdmissionNo || d.student_id || `${d.fname}|${d.mname ?? ''}|${d.lname}|${d.grade}`;

/** Collapses the one-row-per-bill debt list into one entry per student. */
export function groupDebtsByStudent(debts: StudentDebt[]): StudentDebtSummary[] {
  const byStudent = new Map<string, StudentDebtSummary>();
  for (const d of debts) {
    const key = debtKey(d);
    let entry = byStudent.get(key);
    if (!entry) {
      entry = {
        key,
        studentId: d.student_id,
        name: fullName(d),
        grade: d.grade,
        lines: [],
        totalPrice: 0,
        totalPaid: 0,
        totalOwing: 0,
      };
      byStudent.set(key, entry);
    }
    const line: DebtLine = {
      billId: d.bill_id,
      billName: d.util_name,
      sem: d.sem,
      price: toNumber(d.price),
      paid: toNumber(d.paid),
      owing: toNumber(d.owing),
    };
    entry.lines.push(line);
    entry.totalPrice += line.price;
    entry.totalPaid += line.paid;
    entry.totalOwing += line.owing;
  }
  return Array.from(byStudent.values());
}

export interface PaymentStanding {
  fullyPaid: number;
  partlyPaid: number;
  notPaid: number;
}

/**
 * Splits the student body by how much of their bills they've settled.
 * A debtor is "not paid" only when every bill appears in their debts with nothing paid on it;
 * a bill missing from their debts means they cleared it, so they count as part-paid.
 */
export function paymentStanding(
  totalStudents: number,
  debtors: StudentDebtSummary[],
  billCount: number
): PaymentStanding {
  let partlyPaid = 0;
  let notPaid = 0;
  for (const s of debtors) {
    if (s.totalPaid === 0 && s.lines.length >= billCount) notPaid++;
    else partlyPaid++;
  }
  return {
    fullyPaid: Math.max(totalStudents - debtors.length, 0),
    partlyPaid,
    notPaid,
  };
}

export function sumCompleted(payments: Payment[]): number {
  return payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + toNumber(p.amount), 0);
}

/** Outstanding money per bill, largest first. */
export function owingByBill(debts: StudentDebt[]): { billId: number; label: string; owing: number }[] {
  const map = new Map<number, { billId: number; label: string; owing: number }>();
  for (const d of debts) {
    const entry = map.get(d.bill_id) ?? { billId: d.bill_id, label: `${d.util_name} · ${d.sem}`, owing: 0 };
    entry.owing += toNumber(d.owing);
    map.set(d.bill_id, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.owing - a.owing);
}

export function billLabel(bills: Map<number, Bill>, billId: number): string {
  const b = bills.get(billId);
  return b ? `${b.util_name} · ${b.sem}` : `Bill #${billId}`;
}

/** Payer label for a payment row: the student's name and ID once GET /payments joins them in. */
export function payerLabel(p: Payment): string {
  if (p.student_name && p.student_id) return `${p.student_name} · ${p.student_id}`;
  return p.student_name || (p.student_id ? `Student ${p.student_id}` : 'Student ID —');
}

export interface SemesterBills {
  sem: string;
  bills: StudentBill[];
  totalPrice: number;
  totalPaid: number;
  totalRemaining: number;
}

/** Groups one student's bills by semester, keeping the backend's (sem, name) order. */
export function groupBillsBySemester(bills: StudentBill[]): SemesterBills[] {
  const bySem = new Map<string, SemesterBills>();
  for (const b of bills) {
    let entry = bySem.get(b.sem);
    if (!entry) {
      entry = { sem: b.sem, bills: [], totalPrice: 0, totalPaid: 0, totalRemaining: 0 };
      bySem.set(b.sem, entry);
    }
    entry.bills.push(b);
    entry.totalPrice += toNumber(b.amount);
    entry.totalPaid += toNumber(b.paid);
    entry.totalRemaining += Math.max(toNumber(b.remaining), 0);
  }
  return Array.from(bySem.values());
}

export function totalRemaining(bills: StudentBill[]): number {
  return bills.reduce((sum, b) => sum + Math.max(toNumber(b.remaining), 0), 0);
}

export function formatShortDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
  });
}
