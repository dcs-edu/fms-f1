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
  UpdateRoleRequest,
  Utility,
  UtilityPrice,
  DateRangeKey,
  UserRole,
} from './types';

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
    return this.request<Payment>(`/payments/online/${encodeURIComponent(reference)}`, {
      method: 'GET',
    });
  }

  async getStudentPaymentHistory(studentId: string, range: DateRangeKey = 'this_month'): Promise<StudentPayments> {
    return this.request<StudentPayments>(
      `/payments/students/${encodeURIComponent(studentId)}?range=${range}`,
      { method: 'GET' }
    );
  }

  // ==================== BURSAR & CASH ====================

  async getAllPayments(range: DateRangeKey = 'this_month'): Promise<Payment[]> {
    return this.request<Payment[]>(`/payments?range=${range}`, {
      method: 'GET',
    });
  }

  async recordCashPayment(data: NewPaymentRequest): Promise<Payment> {
    return this.request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== UTILITIES & BILLS ====================

  /** Go router maps listing utilities to POST /utilities/list */
  async listUtilities(): Promise<Utility[]> {
    return this.request<Utility[]>('/utilities/list', {
      method: 'POST',
    });
  }

  async createUtility(utilName: string): Promise<Utility> {
    return this.request<Utility>('/utilities', {
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

  // ==================== STUDENTS & PARENT LINKS ====================

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
    return this.request<User[]>('/admin', {
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
