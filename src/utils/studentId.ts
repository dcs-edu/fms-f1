/**
 * Student ID utility functions matching pkg/studentid.go
 * Format: "YY-NNNN" (e.g. "30-0042")
 */

const STUDENT_ID_REGEX = /^\d{2}-\d{4}$/;

/**
 * Validates a student ID string
 */
export function isValidStudentID(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return STUDENT_ID_REGEX.test(id.trim());
}

/**
 * Formats graduation year and sequence number into the card student ID
 * gradYear = 30, seqNum = 42 -> "30-0042"
 */
export function formatStudentID(gradYear: number, seqNum: number): string {
  const yy = String(gradYear).padStart(2, '0');
  const nnnn = String(seqNum).padStart(4, '0');
  return `${yy}-${nnnn}`;
}
