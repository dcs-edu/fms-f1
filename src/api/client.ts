import * as SecureStore from 'expo-secure-store';
import { APP_CONFIG } from '../constants/config';
import {
  LoginResponse,
  UserResponse,
  Student,
  Std,
  Payment,
  StudentPayments,
  OnlinePaymentResponse,
  NewPaymentRequest,
  CreateStudentRequest,
  LinkParentRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  UpdateRoleRequest,
  Utility,
  UtilityPrice,
  DateRangeKey,
  UserRole,
  User,
  Bill,
  StudentBills,
  StudentDebt,
  PaymentQuery,
} from './types';
import { deriveStudentID } from '../utils/studentId';

/** Payments carry grad_year + seq_num instead of a student_id; build it once here for every screen. */
const withStudentId = (p: Payment): Payment => ({ ...p, student_id: deriveStudentID(p) });

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  private baseUrl: string = APP_CONFIG.apiBaseUrl;
  private token: string | null = null;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setToken(token: string | null) {
    this.token = token;
  }

  private async getAuthToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      this.token = await SecureStore.getItemAsync(APP_CONFIG.tokenStorageKey);
      return this.token;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      ...(options.headers as Record<string, string>),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      throw new ApiError(
        `Unable to reach server at ${this.baseUrl}. Check your connection or API URL settings.`,
        0
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      // Clean up Go's "400 message" or "500 message" prefixes if present
      let cleanMessage = errorText.trim();
      const match = cleanMessage.match(/^\d{3}\s+(.*)/);
      if (match) {
        cleanMessage = match[1];
      }
      throw new ApiError(cleanMessage || `Request failed with status ${response.status}`, response.status);
    }

    // Check if 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    return text as unknown as T;
  }

  // ==================== AUTH ====================

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(data: { name: string; email: string; phone: string; password: string }): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Emails an 8-digit reset code. Replies the same whether or not the email has an account. */
  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.request<void>('/account/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== PARENT ====================

  async getMyChildren(): Promise<Std[]> {
    return this.request<Std[]>('/me/children', {
      method: 'GET',
    });
  }

  async initiateOnlinePayment(data: NewPaymentRequest): Promise<OnlinePaymentResponse> {
    return this.request<OnlinePaymentResponse>('/payments/online', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOnlinePayment(reference: string): Promise<Payment> {
    const payment = await this.request<Payment>(`/payments/online/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
    return withStudentId(payment);
  }

  async getStudentPaymentHistory(studentId: string, range: DateRangeKey = 'this_month'): Promise<StudentPayments> {
    const data = await this.request<StudentPayments>(
      `/payments/students/${encodeURIComponent(studentId)}?range=${range}`,
      { method: 'GET' }
    );
    return { ...data, payments: (data.payments || []).map(withStudentId) };
  }

  /** Every bill with what this student has paid on it and what is left. */
  async getStudentBills(studentId: string): Promise<StudentBills> {
    const data = await this.request<StudentBills>(
      `/students/${encodeURIComponent(studentId)}/bills`,
      { method: 'GET' }
    );
    return { ...data, bills: data.bills || [] };
  }

  // ==================== BURSAR & CASH ====================

  async getAllPayments(range: DateRangeKey = 'this_month'): Promise<Payment[]> {
    return this.getPayments({ range });
  }

  /** Preset ranges use ?range=; custom windows send ?from=&to= (needs backend support). */
  async getPayments(query: PaymentQuery): Promise<Payment[]> {
    const qs =
      'range' in query
        ? `range=${query.range}`
        : `from=${encodeURIComponent(query.from)}&to=${encodeURIComponent(query.to)}`;
    const data = await this.request<Payment[] | null>(`/payments?${qs}`, { method: 'GET' });
    return (data || []).map(withStudentId);
  }

  async recordCashPayment(data: NewPaymentRequest): Promise<Payment> {
    const payment = await this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return withStudentId(payment);
  }

  // ==================== UTILITIES & BILLS ====================

  async createUtility(utilName: string): Promise<Utility> {
    return this.request<Utility>('/utilities/create', {
      method: 'POST',
      body: JSON.stringify({ util_name: utilName }),
    });
  }

  async createUtilityPrice(utilId: number, sem: string, amount: string): Promise<UtilityPrice> {
    return this.request<UtilityPrice>(`/utilities/${utilId}/prices`, {
      method: 'POST',
      body: JSON.stringify({ sem, amount }),
    });
  }

  /** Every active bill (utility + semester price). */
  async getBills(): Promise<Bill[]> {
    const data = await this.request<Bill[] | null>('/utilities/list', { method: 'GET' });
    return data || [];
  }

  // ==================== STUDENTS & PARENT LINKS ====================

  async getStudents(): Promise<Std[]> {
    const data = await this.request<Std[] | null>('/students', { method: 'GET' });
    return data || [];
  }

  /** Full profile of one student. */
  async getStudentProfile(studentId: string): Promise<Student> {
    const student = await this.request<Student>(
      `/students/profile/${encodeURIComponent(studentId)}`,
      { method: 'GET' }
    );
    return { ...student, student_id: deriveStudentID(student) ?? studentId };
  }

  /** One row per student per bill that still has money owing. */
  async getStudentDebts(): Promise<StudentDebt[]> {
    const data = await this.request<StudentDebt[] | null>('/students/owing', { method: 'GET' });
    return data || [];
  }

  async createStudent(student: CreateStudentRequest): Promise<{ student_info: Student; student_id: string }> {
    return this.request<{ student_info: Student; student_id: string }>('/new/student', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  }

  async linkParent(data: LinkParentRequest): Promise<void> {
    await this.request<void>('/parents/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== ADMIN ====================

  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users', {
      method: 'GET',
    });
  }

  async updateUserRole(data: UpdateRoleRequest): Promise<{ name: string; email: string; role: UserRole }> {
    return this.request<{ name: string; email: string; role: UserRole }>('/admin/users/role', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
