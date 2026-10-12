/**
 * Strict TypeScript models matching the Go backend internal/models and internal/auth packages.
 */

export type UserRole = 'admin' | 'principal' | 'teacher' | 'bursar' | 'parent';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  created_at: string;
}

export interface UserResponse {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  message: string;
}

export interface JWTCustomClaims {
  id: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface Student {
  admission_no: string;
  student_id: string; // e.g. "30-0042"
  fname: string;
  mname?: string;
  lname: string;
  grade: string;
  dob: string; // "YYYY-MM-DD"
  gender: string; // "M" or "F"
  nationality: string;
  address: string;
  guardian: string;
  g_contact: string;
  g_occupation: string;
  e_contact: string;
  med_con: string;
  allergies: string;
  photo?: string;
  created_at: string;
  grad_year: number;
  seq_num: number;
}

/** Slim student model returned by ListChildren and individual payment lookups */
export interface Std {
  student_id: string; // "30-0042"
  fname: string;
  lname: string;
  grade: string;
  mname?: string;
}

export interface Utility {
  id: number;
  util_name: string;
  is_active: boolean;
  sem?: string;
  amount?: string;
}

export interface UtilityPrice {
  bill_id: number;
  util_id: number;
  sem: string;
  amount: string; // Decimal string e.g. "500.00"
}

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Payment {
  txn_id: string;
  bill_id: number;
  admission_no: string;
  amount: string; // Decimal string e.g. "150.00"
  status: PaymentStatus;
  reference?: string | null;
  created_at: string;
  paid_at?: string | null;
  initiated_by?: string | null; // Omitted for parent view
  // Not sent by the backend yet; shown in reports when present
  student_id?: string;
  student_name?: string;
}

export interface StudentPayments {
  student: Std;
  payments: Payment[];
}

export interface OnlinePaymentResponse {
  payment: Payment;
  authorization_url: string;
}

export interface NewPaymentRequest {
  student_id: string;
  bill_id: number;
  amount: string; // string formatted decimal e.g. "150.00"
}

export interface CreateStudentRequest {
  fname: string;
  mname?: string;
  lname: string;
  grade: string;
  dob: string;
  gender: string;
  nationality: string;
  address: string;
  guardian: string;
  g_contact: string;
  g_occupation: string;
  e_contact: string;
  med_con: string;
  allergies: string;
  photo?: string;
}

export interface LinkParentRequest {
  parent_email: string;
  student_id: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateRoleRequest {
  email: string;
  role: UserRole;
}

export type DateRangeKey = 'today' | 'this_week' | 'this_month' | 'three_months_to_date';

/** A utility price with its name joined in, as returned by GET /utilities. */
export interface Bill {
  bill_id: number;
  util_name: string;
  sem: string;
  amount: string;
}

/**
 * One unpaid (or part-paid) bill for one student, as returned by GET /students/owing.
 * The backend currently has no json tag on admission_no, so it arrives as `AdmissionNo`;
 * both spellings are accepted. Money fields are float64 on the backend, so they may be numbers.
 */
export interface StudentDebt {
  admission_no?: string;
  AdmissionNo?: string;
  student_id?: string;
  fname: string;
  mname?: string | null;
  lname: string;
  grade: string;
  bill_id: number;
  util_name: string;
  sem: string;
  price: number | string;
  paid: number | string;
  owing: number | string;
}

/** A preset range key, or a custom inclusive day window (YYYY-MM-DD). */
export type PaymentQuery =
  | { range: DateRangeKey }
  | { from: string; to: string };
