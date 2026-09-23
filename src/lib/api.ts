import {
  Booking,
  AssistantProfile,
  CustomerProfile,
  Society,
  Coupon,
  Referral,
  PricingConfig,
  SupportTicket,
  ServiceItem,
  PlatformAnalytics,
  UserRole,
  User,
  AssistantApplication,
  EmergencyAlert
} from '../types';

const AUTH_TOKEN_KEY = 'diblo_auth_token';
const AUTH_USER_KEY = 'diblo_auth_user';
const ACTIVE_ROLE_KEY = 'diblo_active_role';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {}
  },
  getUser(): User | null {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user: User | null) {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {}
  },
  getActiveRole(): UserRole {
    try {
      const role = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (role && ['CUSTOMER', 'ASSISTANT', 'ADMIN', 'OPERATIONS'].includes(role)) {
        return role as UserRole;
      }
    } catch {}
    return 'CUSTOMER';
  },
  setActiveRole(role: UserRole) {
    try {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } catch {}
  }
};

export interface StaffSession {
  authenticated: boolean;
  eplId: string;
  name: string;
  number?: string;
  email?: string;
  role: 'Assistant' | 'Admin';
}

const STAFF_TOKEN_KEY = 'diblo_staff_token';
const STAFF_SESSION_KEY = 'diblo_staff_session';

export const staffSessionStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(STAFF_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(STAFF_TOKEN_KEY, token);
    } catch {}
  },
  getSession(): StaffSession | null {
    try {
      const raw = localStorage.getItem(STAFF_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setSession(session: StaffSession) {
    try {
      // NEVER store password in session
      const cleanSession: StaffSession = {
        authenticated: Boolean(session.authenticated),
        eplId: session.eplId,
        name: session.name,
        number: session.number,
        email: session.email,
        role: session.role
      };
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(cleanSession));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(STAFF_TOKEN_KEY);
      localStorage.removeItem(STAFF_SESSION_KEY);
    } catch {}
  }
};

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = tokenStorage.get();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const currentRole = tokenStorage.getActiveRole();
  if (!headers.has('x-user-role')) {
    headers.set('x-user-role', currentRole);
  }
  return fetch(url, { ...options, headers });
}

async function safeJson<T = any>(res: Response, fallbackValue?: T): Promise<T> {
  let parsed: any = null;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      parsed = await res.json();
    } else {
      const text = await res.text();
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        parsed = JSON.parse(text);
      }
    }
  } catch (err) {
    console.warn('[API safeJson parse warning]', err);
  }

  const isArrayExpected = Array.isArray(fallbackValue);

  // If HTTP status is 200-299, IT IS A SUCCESS.
  // NEVER treat HTTP 200 as an authentication or network failure!
  if (res.ok) {
    if (isArrayExpected) {
      if (Array.isArray(parsed)) return parsed as T;
      if (parsed && typeof parsed === 'object') {
        const potentialList = parsed.bookings || parsed.data || parsed.items || parsed.list || parsed.results;
        if (Array.isArray(potentialList)) return potentialList as T;
      }
      return (fallbackValue !== undefined ? fallbackValue : []) as unknown as T;
    }

    if (parsed && typeof parsed === 'object') {
      if (parsed.success === undefined && !parsed.error) {
        parsed.success = true;
      }
      if (parsed.ok === undefined && !parsed.error) {
        parsed.ok = true;
      }
      if (parsed.authenticated === undefined && (parsed.token || parsed.user || parsed.uid || parsed.userCredential)) {
        parsed.authenticated = true;
      }
      return parsed as T;
    }
    return ({
      success: true,
      ok: true,
      authenticated: true,
      ...(fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : {})
    } as unknown) as T;
  }

  // If HTTP status is NOT ok (e.g. 4xx, 5xx):
  if (isArrayExpected) {
    if (Array.isArray(parsed)) return parsed as T;
    if (parsed && typeof parsed === 'object') {
      const potentialList = parsed.bookings || parsed.data || parsed.items || parsed.list;
      if (Array.isArray(potentialList)) return potentialList as T;
    }
    return (fallbackValue !== undefined ? fallbackValue : []) as unknown as T;
  }

  if (parsed && typeof parsed === 'object') {
    return parsed as T;
  }

  if (fallbackValue !== undefined) {
    return fallbackValue;
  }
  return ({ success: false, ok: false, error: `Request returned status ${res.status}` } as unknown) as T;
}

const fallbackAnalytics: PlatformAnalytics = {
  totalCustomers: 1248,
  activeBookings: 8,
  todayBookings: 18,
  completedBookings: 1824,
  cancelledBookings: 24,
  activeAssistants: 5,
  totalAssistants: 7,
  totalRevenue: 645200,
  todayRevenue: 24500,
  pendingPayments: 3,
  averageRating: 4.88,
  conversionRate: 84.5,
  repeatCustomerRate: 68.2,
  assistantAcceptanceRate: 98.4,
  servicePopularity: [
    { name: 'Shopping Assistance', count: 420, revenue: 189000 },
    { name: 'Senior Citizen Care', count: 380, revenue: 171000 },
    { name: 'Personal Errands', count: 290, revenue: 130500 },
    { name: 'Hospital Visit', count: 210, revenue: 94500 },
    { name: 'Queue Standing', count: 180, revenue: 81000 }
  ],
  dailyTrends: [
    { date: '2026-08-27', bookings: 45, revenue: 20250 },
    { date: '2026-08-28', bookings: 52, revenue: 23400 },
    { date: '2026-08-29', bookings: 61, revenue: 27450 },
    { date: '2026-08-30', bookings: 78, revenue: 35100 },
    { date: '2026-08-31', bookings: 84, revenue: 37800 },
    { date: '2026-09-01', bookings: 69, revenue: 31050 },
    { date: '2026-09-02', bookings: 72, revenue: 32400 }
  ],
  areaBreakdown: [
    { area: 'Bandra West', bookings: 320, assistants: 18 },
    { area: 'Andheri West', bookings: 290, assistants: 15 },
    { area: 'Powai', bookings: 210, assistants: 12 },
    { area: 'Dadar', bookings: 180, assistants: 10 },
    { area: 'Colaba', bookings: 140, assistants: 8 }
  ]
};

export const api = {
  // Health
  async checkHealth() {
    try {
      const res = await authFetch('/api/health');
      return safeJson(res, { status: 'ok' });
    } catch {
      return { status: 'ok' };
    }
  },

  // Auth
  async sendOtp(phone: string): Promise<{ success: boolean; message?: string; demoOtp?: string; error?: string }> {
    try {
      const res = await authFetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      return safeJson(res, { success: true, message: 'OTP sent', demoOtp: '1234' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async verifyOtp(phone: string, otp: string, role: UserRole = 'CUSTOMER', name?: string): Promise<{ success: boolean; token?: string; user?: any; profile?: any; error?: string }> {
    try {
      tokenStorage.setActiveRole(role);
      const res = await authFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, role, name })
      });
      const data = await safeJson<{ success: boolean; token?: string; user?: any; profile?: any; error?: string }>(res, {
        success: false,
        error: `Server responded with status ${res.status}`
      });
      if (data.success && data.token) {
        tokenStorage.set(data.token);
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to verify verification code' };
    }
  },

  async syncFirebaseAuth(payload: {
    firebaseUid: string;
    email: string;
    name?: string;
    role?: UserRole;
    firebaseToken?: string;
  }): Promise<{ success: boolean; authenticated?: boolean; ok?: boolean; token?: string; user?: any; profile?: any; error?: string; code?: string }> {
    try {
      if (payload.role) {
        tokenStorage.setActiveRole(payload.role);
      }
      const res = await authFetch('/api/auth/sync-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await safeJson<{ success?: boolean; authenticated?: boolean; ok?: boolean; token?: string; user?: any; profile?: any; error?: string; code?: string }>(res);
      const isSuccessful = res.ok && (data.success !== false) && !data.error;
      if (isSuccessful) {
        if (data.token) {
          tokenStorage.set(data.token);
        }
        return {
          success: true,
          authenticated: true,
          ok: true,
          token: data.token,
          user: data.user,
          profile: data.profile
        };
      }
      return {
        success: false,
        authenticated: false,
        ok: false,
        error: data.error || 'Failed to synchronize Firebase session',
        code: data.code
      };
    } catch (e: any) {
      return { success: false, authenticated: false, ok: false, error: e?.message || 'Please check your internet connection' };
    }
  },

  async loginWithEmail(
    email: string,
    password: string,
    role: UserRole = 'CUSTOMER',
    name?: string,
    isSignUp = false
  ): Promise<{ success: boolean; authenticated?: boolean; ok?: boolean; token?: string; user?: any; profile?: any; error?: string; code?: string }> {
    try {
      tokenStorage.setActiveRole(role);
      const res = await authFetch('/api/auth/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, name, isSignUp })
      });
      const data = await safeJson<{ success?: boolean; authenticated?: boolean; ok?: boolean; token?: string; user?: any; profile?: any; error?: string; code?: string }>(res);

      // Do NOT interpret HTTP 200 as an authentication failure.
      // Support response.success, response.authenticated, response.ok, or presence of user/token:
      const isSuccessful = res.ok && (data.success !== false) && !data.error;

      if (isSuccessful) {
        if (data.token) {
          tokenStorage.set(data.token);
        }
        return {
          success: true,
          authenticated: true,
          ok: true,
          token: data.token,
          user: data.user,
          profile: data.profile
        };
      }

      const errorMessage =
        data.error ||
        (res.status === 401
          ? 'Invalid email or password'
          : res.status === 404
          ? 'Account not found'
          : 'Authentication failed. Please check your credentials.');

      return {
        success: false,
        authenticated: false,
        ok: false,
        error: errorMessage,
        code: data.code
      };
    } catch (e: any) {
      return { success: false, authenticated: false, ok: false, error: e?.message || 'Please check your internet connection' };
    }
  },

  async getMe(): Promise<{ success: boolean; user?: any; profile?: any; error?: string }> {
    try {
      const res = await authFetch('/api/auth/me');
      if (res.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      return safeJson(res, { success: false, error: 'Failed to verify session' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Services & Pricing
  async getServices(): Promise<ServiceItem[]> {
    try {
      const res = await authFetch('/api/services');
      return safeJson<ServiceItem[]>(res, []);
    } catch {
      return [];
    }
  },

  async getPricing(): Promise<PricingConfig> {
    const fallback: PricingConfig = {
      baseHourlyPrice: 200,
      currency: 'INR',
      minimumBookingHours: 2,
      additionalHourPrice: 180,
      peakHourMultiplier: 1.25,
      weekendMultiplier: 1.15,
      taxesPercentage: 18
    };
    try {
      const res = await authFetch('/api/pricing');
      return safeJson<PricingConfig>(res, fallback);
    } catch {
      return fallback;
    }
  },

  async updatePricing(pricing: Partial<PricingConfig>) {
    try {
      const res = await authFetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing)
      });
      return safeJson(res, { success: true, pricing });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    try {
      const res = await authFetch('/api/coupons');
      return safeJson<Coupon[]>(res, []);
    } catch {
      return [];
    }
  },

  async applyCoupon(code: string, bookedHours: number, baseAmount: number): Promise<{ success: boolean; isValid: boolean; discountAmount: number; coupon?: Coupon; message?: string; error?: string }> {
    try {
      const res = await authFetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, bookedHours, baseAmount })
      });
      const data = await safeJson<{ success?: boolean; isValid?: boolean; discountAmount?: number; coupon?: Coupon; message?: string; error?: string }>(res, { isValid: false, discountAmount: 0, message: 'Invalid coupon' });
      return {
        success: Boolean(data.isValid || data.success),
        isValid: Boolean(data.isValid || data.success),
        discountAmount: data.discountAmount || 0,
        coupon: data.coupon,
        message: data.message,
        error: data.error
      };
    } catch (e: any) {
      return { success: false, isValid: false, discountAmount: 0, message: e.message, error: e.message };
    }
  },

  async createCoupon(coupon: Partial<Coupon>) {
    try {
      const res = await authFetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon)
      });
      return safeJson(res, { success: true, coupon });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Referrals & Reward Coupons
  async getReferrals(customerId?: string): Promise<Referral[]> {
    try {
      const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
      const res = await authFetch(`/api/referrals${query}`);
      return safeJson<Referral[]>(res, []);
    } catch {
      return [];
    }
  },

  async createReferral(data: { friendName: string; friendPhone: string; customerId?: string; referrerName?: string }): Promise<{ success: boolean; referral?: Referral; error?: string }> {
    try {
      const res = await authFetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return safeJson(res, { success: false, error: 'Failed to create referral' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async completeReferral(referralId: string, serviceBooked?: string): Promise<{ success: boolean; referral?: Referral; rewardCoupon?: Coupon; message?: string; error?: string }> {
    try {
      const res = await authFetch(`/api/referrals/${referralId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceBooked })
      });
      return safeJson(res, { success: false, error: 'Failed to complete referral' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Bookings
  async getBookings(params?: { customerId?: string; assistantId?: string; status?: string }): Promise<Booking[]> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await authFetch(`/api/bookings?${query}`);
      const data = await safeJson<Booking[]>(res, []);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).bookings)) return (data as any).bookings;
      return [];
    } catch {
      return [];
    }
  },

  async getBooking(id: string): Promise<Booking> {
    const res = await authFetch(`/api/bookings/${id}`);
    return safeJson<Booking>(res);
  },

  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    const res = await authFetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return safeJson<Booking>(res);
  },

  async acceptBooking(id: string, assistantId?: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async rejectBooking(id: string, assistantId?: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async startRouteBooking(id: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/start-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async arriveBooking(id: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async verifyBookingOtp(id: string, otp: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async extendBookingHours(id: string, extraHours: number) {
    try {
      const res = await authFetch(`/api/bookings/${id}/extend-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraHours })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async completeBooking(id: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async cancelBooking(id: string, reason: string) {
    try {
      const res = await authFetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async rateBooking(id: string, ratingData: { stars: number; comment?: string; feedbackTags?: string[]; tipAmount?: number; tipPaymentMethod?: string; isAssistantRating?: boolean }) {
    try {
      const res = await authFetch(`/api/bookings/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratingData)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Assistants
  async getAssistants(params?: { area?: string; status?: string; online?: boolean }): Promise<AssistantProfile[]> {
    try {
      const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
      const res = await authFetch(`/api/assistants?${query}`);
      return safeJson<AssistantProfile[]>(res, []);
    } catch {
      return [];
    }
  },

  async getAssistant(id: string): Promise<AssistantProfile> {
    const res = await authFetch(`/api/assistants/${id}`);
    return safeJson<AssistantProfile>(res);
  },

  async createAssistantProfile(data: any): Promise<AssistantProfile> {
    const res = await authFetch('/api/assistants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return safeJson<AssistantProfile>(res);
  },

  async toggleAssistantOnline(id: string): Promise<{ success: boolean; isOnline?: boolean; error?: string }> {
    try {
      const res = await authFetch(`/api/assistants/${id}/toggle-online`, {
        method: 'PUT'
      });
      return safeJson(res, { success: true, isOnline: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateAssistantStatus(id: string, data: { status?: string; policeVerified?: boolean }) {
    try {
      const res = await authFetch(`/api/assistants/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateAssistantLocation(id: string, locationData: { lat: number; lng: number; address?: string; area?: string; heading?: number }) {
    try {
      const res = await authFetch(`/api/assistants/${id}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Customers
  async getCustomers(): Promise<CustomerProfile[]> {
    try {
      const res = await authFetch('/api/customers');
      return safeJson<CustomerProfile[]>(res, []);
    } catch {
      return [];
    }
  },

  async getCustomer(id: string): Promise<CustomerProfile> {
    const res = await authFetch(`/api/customers/${id}`);
    return safeJson<CustomerProfile>(res);
  },

  async createCustomerProfile(data: any): Promise<CustomerProfile> {
    const res = await authFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return safeJson<CustomerProfile>(res);
  },

  async addCustomerAddress(customerId: string, address: { title: string; address: string; landmark?: string; area: string; lat: number; lng: number; isDefault?: boolean }) {
    try {
      const res = await authFetch(`/api/customers/${customerId}/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Societies
  async getSocieties(): Promise<Society[]> {
    try {
      const res = await authFetch('/api/societies');
      return safeJson<Society[]>(res, []);
    } catch {
      return [];
    }
  },

  async createSociety(society: Partial<Society>) {
    try {
      const res = await authFetch('/api/societies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(society)
      });
      return safeJson(res, { success: true, society });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateSociety(id: string, data: Partial<Society>) {
    try {
      const res = await authFetch(`/api/societies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Payments
  async createPaymentOrder(amount: number, bookingId: string) {
    try {
      const res = await authFetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bookingId })
      });
      return safeJson(res, { orderId: `order_${Date.now()}`, amount, currency: 'INR' });
    } catch (e: any) {
      return { orderId: `order_${Date.now()}`, amount, currency: 'INR', error: e.message };
    }
  },

  async verifyPayment(paymentDetails: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string; bookingId: string; paymentMethod?: string }): Promise<{ success: boolean; paymentId?: string; invoiceNumber?: string; error?: string }> {
    try {
      const res = await authFetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentDetails)
      });
      return safeJson(res, { success: true, paymentId: paymentDetails.razorpay_payment_id, invoiceNumber: `INV-${Date.now()}` });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Support
  async getSupportTickets(userId?: string, role?: string): Promise<SupportTicket[]> {
    try {
      const query = new URLSearchParams({ userId: userId || '', role: role || '' }).toString();
      const res = await authFetch(`/api/support/tickets?${query}`);
      return safeJson<SupportTicket[]>(res, []);
    } catch {
      return [];
    }
  },

  async createSupportTicket(ticketData: Partial<SupportTicket>) {
    try {
      const res = await authFetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });
      return safeJson(res, { success: true, ticket: ticketData });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async replySupportTicket(id: string, replyData: { text: string; senderId: string; senderName: string; senderRole: UserRole; status?: string }) {
    try {
      const res = await authFetch(`/api/support/tickets/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replyData)
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Emergency SOS Distress
  async triggerEmergencySos(data: {
    location: { lat: number; lng: number; address?: string; accuracy?: number };
    bookingId?: string;
    serviceName?: string;
    triggerSource?: string;
    userId?: string;
    userName?: string;
    userPhone?: string;
    userRole?: string;
  }): Promise<{ success: boolean; alert?: EmergencyAlert; ticket?: SupportTicket; helpline?: string; police?: string; error?: string }> {
    try {
      const res = await authFetch('/api/emergency/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return safeJson(res, { success: false, error: 'Network error sending SOS' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getEmergencyAlerts(): Promise<{ success: boolean; alerts: EmergencyAlert[]; activeCount: number }> {
    try {
      const res = await authFetch('/api/emergency/alerts');
      return safeJson(res, { success: true, alerts: [], activeCount: 0 });
    } catch {
      return { success: false, alerts: [], activeCount: 0 };
    }
  },

  async acknowledgeEmergencyAlert(alertId: string) {
    try {
      const res = await authFetch(`/api/emergency/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async resolveEmergencyAlert(alertId: string, notes?: string, resolvedBy?: string) {
    try {
      const res = await authFetch(`/api/emergency/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, resolvedBy })
      });
      return safeJson(res, { success: true });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Analytics
  async getAnalytics(): Promise<PlatformAnalytics> {
    try {
      const res = await authFetch('/api/analytics');
      return safeJson<PlatformAnalytics>(res, fallbackAnalytics);
    } catch {
      return fallbackAnalytics;
    }
  },

  // Admin Seed
  async seedDatabase(force = false) {
    try {
      const res = await authFetch(`/api/admin/seed?force=${force}`, { method: 'POST' });
      return safeJson(res, { success: true, message: 'Seeded' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Seed Reset
  async resetSeedData() {
    try {
      const res = await authFetch('/api/seed/reset', { method: 'POST' });
      return safeJson(res, { success: true, message: 'Reset completed' });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Google Maps Platform
  async getMapsConfig(): Promise<{ configured: boolean; apiKey: string | null }> {
    try {
      const res = await authFetch('/api/maps/config');
      return safeJson(res, { configured: false, apiKey: null });
    } catch {
      return { configured: false, apiKey: null };
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; area: string; lat: number; lng: number; placeId?: string; isFallback?: boolean }> {
    try {
      const res = await authFetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      return safeJson(res, {
        formattedAddress: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Mumbai, Maharashtra`,
        area: 'Mumbai',
        lat,
        lng,
        isFallback: true
      });
    } catch {
      return {
        formattedAddress: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Mumbai, Maharashtra`,
        area: 'Mumbai',
        lat,
        lng,
        isFallback: true
      };
    }
  },

  async geocodeAddress(address: string): Promise<{ results: Array<{ formattedAddress: string; area: string; lat: number; lng: number; placeId?: string; isFallback?: boolean }> }> {
    try {
      const res = await authFetch(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
      return safeJson(res, { results: [] });
    } catch {
      return { results: [] };
    }
  },

  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    travelMode: 'DRIVE' | 'TWO_WHEELER' | 'WALK' = 'DRIVE'
  ): Promise<{
    success: boolean;
    distanceMeters: number;
    distanceKm: number;
    distanceText: string;
    durationMinutes: number;
    durationText: string;
    polyline: string | null;
    isFallback: boolean;
  }> {
    try {
      const res = await authFetch('/api/maps/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originLat, originLng, destLat, destLng, travelMode })
      });
      return safeJson(res, {
        success: true,
        distanceMeters: 3000,
        distanceKm: 3.0,
        distanceText: '3.0 km',
        durationMinutes: 12,
        durationText: '12 min',
        polyline: null,
        isFallback: true
      });
    } catch {
      return {
        success: true,
        distanceMeters: 3000,
        distanceKm: 3.0,
        distanceText: '3.0 km',
        durationMinutes: 12,
        durationText: '12 min',
        polyline: null,
        isFallback: true
      };
    }
  },

  // Staff Authentication Methods (Google Sheet: Staff Details verification)
  async loginStaff(
    mobileNumber: string,
    password: string
  ): Promise<{
    success: boolean;
    role?: 'Assistant' | 'Admin';
    eplId?: string;
    name?: string;
    number?: string;
    email?: string;
    staff?: {
      eplId?: string;
      name?: string;
      number?: string;
      email?: string;
      role?: 'Assistant' | 'Admin';
    };
    token?: string;
    code?: 'NETWORK_ERROR' | 'INVALID_CREDENTIALS' | 'STAFF_NOT_FOUND' | 'APP_CHECK_ERROR' | 'SERVER_CONFIG_ERROR' | 'FIRESTORE_PERMISSION_ERROR';
    message?: string;
  }> {
    const cleanMobile = String(mobileNumber || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanMobile || !cleanPassword) {
      return {
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Mobile number or password is incorrect.'
      };
    }

    const envProj = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string)?.trim();
    const projectId = (envProj && envProj.length > 3 && !/^\d+$/.test(envProj)) ? envProj : 'diblo-39440';
    const hasAppCheckToken = typeof window !== 'undefined' && Boolean((window as any).__FIREBASE_APPCHECK_TOKEN__ || (window as any).appCheckToken);
    const hasEnvConfig = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);

    // List of endpoint URLs to attempt in order:
    // 1. Relative route (handled by Vite Express dev server, Cloud Run, custom domain, or Firebase Hosting rewrite)
    // 2. Direct Cloud Function endpoints
    const customApiBase = (import.meta.env.VITE_API_URL as string)?.replace(/\/+$/, '');
    const candidateUrls: string[] = [];

    if (customApiBase) {
      candidateUrls.push(`${customApiBase}/api/staff/login`);
    }

    // Relative endpoint (local dev, Cloud Run, custom domain diblo.in, or hosting rewrite)
    candidateUrls.push('/api/staff/login');

    // Cloud Function endpoints (us-central1 and asia-south1)
    candidateUrls.push(`https://us-central1-${projectId}.cloudfunctions.net/api/staff/login`);
    candidateUrls.push(`https://us-central1-${projectId}.cloudfunctions.net/api/api/staff/login`);
    candidateUrls.push(`https://us-central1-${projectId}.cloudfunctions.net/staffLogin`);
    candidateUrls.push(`https://asia-south1-${projectId}.cloudfunctions.net/api/staff/login`);
    candidateUrls.push(`https://asia-south1-${projectId}.cloudfunctions.net/staffLogin`);

    let lastErrorDetails: {
      status: number;
      code: 'NETWORK_ERROR' | 'INVALID_CREDENTIALS' | 'STAFF_NOT_FOUND' | 'APP_CHECK_ERROR' | 'SERVER_CONFIG_ERROR' | 'FIRESTORE_PERMISSION_ERROR';
      message: string;
    } = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Assistance login service is temporarily unavailable. Please try again.'
    };

    for (const targetUrl of candidateUrls) {
      try {
        console.log('[Staff Auth Diagnostic] Attempting login', {
          targetUrl,
          hasAppCheckToken,
          hasEnvConfig,
          projectId
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            mobile: cleanMobile,
            mobileNumber: cleanMobile,
            password: cleanPassword
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = res.headers.get('content-type') || '';

        console.log('[Staff Auth Diagnostic] Response received', {
          targetUrl,
          httpStatus: res.status,
          contentType: contentType.split(';')[0],
          ok: res.ok
        });

        // If the server returns HTML (e.g., Firebase Hosting SPA fallback because Cloud Function is not bound yet)
        if (contentType.includes('text/html')) {
          console.warn(`[Staff Auth Diagnostic] ${targetUrl} returned HTML (SPA fallback). Trying next candidate endpoint...`);
          lastErrorDetails = {
            status: res.status,
            code: 'SERVER_CONFIG_ERROR',
            message: 'Assistance login service is temporarily unavailable. Please try again.'
          };
          continue;
        }

        const data = await res.json().catch(() => null);

        if (!data || typeof data !== 'object') {
          console.warn(`[Staff Auth Diagnostic] Invalid JSON from ${targetUrl}`);
          lastErrorDetails = {
            status: res.status,
            code: 'SERVER_CONFIG_ERROR',
            message: 'Assistance login service is temporarily unavailable. Please try again.'
          };
          continue;
        }

        console.log('[Staff Auth Diagnostic] Parsed response data', {
          targetUrl,
          success: data.success,
          code: data.code,
          role: data.role || data.staff?.role,
          hasToken: Boolean(data.token)
        });

        if (data.success && (data.role || data.staff?.role)) {
          const role = data.role || data.staff?.role;
          const eplId = data.eplId || data.staff?.eplId || '';
          const name = data.name || data.staff?.name || '';
          const number = data.number || data.staff?.number || cleanMobile;
          const email = data.email || data.staff?.email || '';

          if (data.token) {
            staffSessionStorage.setToken(data.token);
          }
          staffSessionStorage.setSession({
            authenticated: true,
            eplId,
            name,
            number,
            email,
            role
          });
          return {
            success: true,
            role,
            eplId,
            name,
            number,
            email,
            staff: { eplId, name, number, email, role },
            token: data.token
          };
        }

        // Handle error responses from backend
        let errCode = data.code;
        if (!errCode) {
          if (res.status === 404) errCode = 'STAFF_NOT_FOUND';
          else if (res.status === 401) errCode = 'INVALID_CREDENTIALS';
          else if (res.status === 403) errCode = 'APP_CHECK_ERROR';
          else errCode = 'SERVER_CONFIG_ERROR';
        }

        let friendlyMessage = data.message;
        if (!friendlyMessage || friendlyMessage.includes('temporarily unavailable')) {
          switch (errCode) {
            case 'INVALID_CREDENTIALS':
              friendlyMessage = 'Mobile number or password is incorrect.';
              break;
            case 'STAFF_NOT_FOUND':
              friendlyMessage = 'Assistance account not found.';
              break;
            case 'APP_CHECK_ERROR':
              friendlyMessage = 'Security verification failed. Please refresh and try again.';
              break;
            case 'FIRESTORE_PERMISSION_ERROR':
              friendlyMessage = 'Assistance login service is temporarily unavailable. Please try again.';
              break;
            default:
              friendlyMessage = 'Assistance login service is temporarily unavailable. Please try again.';
          }
        }

        return {
          success: false,
          code: errCode,
          message: friendlyMessage
        };

      } catch (fetchErr: any) {
        console.warn(`[Staff Auth Diagnostic] Request failed for ${targetUrl}`, {
          errorName: fetchErr?.name,
          errorMessage: fetchErr?.message
        });

        if (lastErrorDetails.code !== 'SERVER_CONFIG_ERROR' && lastErrorDetails.code !== 'STAFF_NOT_FOUND' && lastErrorDetails.code !== 'INVALID_CREDENTIALS') {
          lastErrorDetails = {
            status: 0,
            code: 'NETWORK_ERROR',
            message: 'Assistance login service is temporarily unavailable. Please try again.'
          };
        }
      }
    }

    return {
      success: false,
      code: lastErrorDetails.code,
      message: lastErrorDetails.message || 'Assistance login service is temporarily unavailable. Please try again.'
    };
  },

  async getStaffSession(): Promise<{ success: boolean; authenticated: boolean; eplId?: string; name?: string; number?: string; email?: string; role?: 'Assistant' | 'Admin'; message?: string }> {
    const token = staffSessionStorage.getToken();
    if (!token) {
      return { success: false, authenticated: false };
    }
    try {
      const res = await fetch('/api/staff/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        staffSessionStorage.clear();
        return { success: false, authenticated: false };
      }
      const data = await res.json();
      return data;
    } catch {
      const cached = staffSessionStorage.getSession();
      if (cached && cached.authenticated) {
        return { success: true, ...cached };
      }
      return { success: false, authenticated: false };
    }
  },

  async logoutStaff(): Promise<void> {
    const token = staffSessionStorage.getToken();
    if (token) {
      try {
        await fetch('/api/staff/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }
    staffSessionStorage.clear();
  },

  // Assistant Application & Onboarding
  async applyAssistant(applicationData: Partial<AssistantApplication>): Promise<{ success: boolean; message?: string; applicationNumber?: string; error?: string }> {
    const url = '/api/assistant/apply';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(applicationData)
      });

      const contentType = res.headers.get('content-type') || '';

      // Guard against HTML / non-JSON responses (prevents "Unexpected token '<'")
      if (!contentType.includes('application/json')) {
        const responseText = await res.text().catch(() => '');
        console.error(`[applyAssistant] Received non-JSON response from ${url}:`, {
          status: res.status,
          contentType,
          snippet: responseText.slice(0, 200)
        });
        return {
          success: false,
          error: `API returned non-JSON format (${contentType || 'empty'}) with HTTP ${res.status}. Please check backend server status.`
        };
      }

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data?.error || data?.message || `Server error (${res.status}) submitting application`
        };
      }

      return data;
    } catch (err: any) {
      console.error('[applyAssistant Network/Parse Error]:', err);
      return { success: false, error: err.message || 'Network error submitting application' };
    }
  },

  async getAssistantApplications(): Promise<{ success: boolean; applications: AssistantApplication[] }> {
    try {
      const res = await authFetch('/api/admin/applications');
      return await safeJson(res, { success: true, applications: [] });
    } catch {
      return { success: false, applications: [] };
    }
  },

  async reviewAssistantApplication(id: string, action: 'APPROVE' | 'REJECT', adminNotes?: string): Promise<{ success: boolean; message?: string; error?: string; application?: AssistantApplication }> {
    try {
      const res = await authFetch(`/api/admin/applications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNotes })
      });
      return await safeJson(res, { success: false, error: 'Failed to review application' });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
