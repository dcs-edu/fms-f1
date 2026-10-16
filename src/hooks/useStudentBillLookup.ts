import { useCallback, useState } from 'react';
import { api } from '../api/client';
import { Std, StudentBill } from '../api/types';
import { isValidStudentID } from '../utils/studentId';
import { initialBill, owingOn } from '../components/payments/SemesterBillPicker';

/**
 * Staff payment screens: type a student ID, load that student's bills, pick one and an amount.
 * Replaces typing a bill_id by hand.
 */
export function useStudentBillLookup() {
  const [studentId, setStudentIdRaw] = useState('');
  const [student, setStudent] = useState<Std | null>(null);
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const selectBill = useCallback((b: StudentBill) => {
    setSelectedBillId(b.bill_id);
    setAmount(owingOn(b).toFixed(2));
  }, []);

  const applyBills = useCallback(
    (next: StudentBill[], keepBillId?: number | null) => {
      setBills(next);
      const first = initialBill(next, keepBillId ?? undefined);
      if (first) {
        selectBill(first);
      } else {
        setSelectedBillId(null);
        setAmount('');
      }
    },
    [selectBill]
  );

  // a different ID means the loaded bills no longer belong to what's typed
  const setStudentId = useCallback((id: string) => {
    setStudentIdRaw(id);
    setStudent(null);
    setBills([]);
    setSelectedBillId(null);
    setAmount('');
    setLookupError(null);
  }, []);

  const lookup = useCallback(async () => {
    const id = studentId.trim();
    if (!isValidStudentID(id)) {
      setLookupError('Student ID must look like YY-NNNN (e.g. 30-0042)');
      return;
    }
    try {
      setLooking(true);
      setLookupError(null);
      const res = await api.getStudentBills(id);
      setStudent(res.student);
      applyBills(res.bills);
    } catch (err: any) {
      setStudent(null);
      setBills([]);
      setLookupError(err.message || 'Could not find that student');
    } finally {
      setLooking(false);
    }
  }, [studentId, applyBills]);

  /** Reload balances after a payment, staying on the same bill while it still has money owing. */
  const refresh = useCallback(async () => {
    if (!student) return;
    try {
      const res = await api.getStudentBills(student.student_id);
      applyBills(res.bills, selectedBillId);
    } catch {
      // keep showing the old balances; the next lookup will correct them
    }
  }, [student, selectedBillId, applyBills]);

  const selectedBill = bills.find((b) => b.bill_id === selectedBillId) ?? null;

  return {
    studentId,
    setStudentId,
    student,
    bills,
    selectedBill,
    selectBill,
    amount,
    setAmount,
    looking,
    lookupError,
    lookup,
    refresh,
  };
}
