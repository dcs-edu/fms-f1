/**
 * Student ID utility functions matching pkg/studentid.go
 * Format: "YY-NNNN" (e.g. "30-0042"), built from the students table's grad_year and seq_num.
 */

const STUDENT_ID_REGEX = /^(\d{2})-(\d{4})$/;

/**
 * Validates a student ID string
 */
export function isValidStudentID(id: string): boolean {
  return parseStudentID(id) !== null;
}

/**
 * Mirrors ParseStudentID: "30-0042" -> { gradYear: 30, seqNum: 42 }, or null when the
 * backend would reject it (wrong shape, or a sequence number below 1).
 */
export function parseStudentID(id: string): { gradYear: number; seqNum: number } | null {
  if (!id || typeof id !== 'string') return null;
  const match = STUDENT_ID_REGEX.exec(id.trim());
  if (!match) return null;
  const gradYear = parseInt(match[1], 10);
  const seqNum = parseInt(match[2], 10);
  if (seqNum < 1) return null;
  return { gradYear, seqNum };
}

/**
 * The reverse of ParseStudentID (FormatStudentID on the backend):
 * gradYear = 30, seqNum = 42 -> "30-0042"
 */
export function formatStudentID(gradYear: number, seqNum: number): string {
  const yy = String(gradYear).padStart(2, '0');
  const nnnn = String(seqNum).padStart(4, '0');
  return `${yy}-${nnnn}`;
}

/**
 * The student ID for a record that carries grad_year and seq_num instead of a ready-made
 * student_id (payments, the full student profile). An existing student_id wins.
 */
export function deriveStudentID(rec: {
  student_id?: string | null;
  grad_year?: number | null;
  seq_num?: number | null;
}): string | undefined {
  if (rec.student_id) return rec.student_id;
  if (rec.grad_year == null || rec.seq_num == null || rec.seq_num < 1) return undefined;
  return formatStudentID(rec.grad_year, rec.seq_num);
}
