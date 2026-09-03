import {
  Booking,
  AssistantProfile,
  CustomerProfile,
  Society,
  Coupon,
  PricingConfig,
  SupportTicket,
  ServiceItem,
  PlatformAnalytics,
  UserRole
} from '../types';

const AUTH_TOKEN_KEY = 'diblo_auth_token';

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
  clear() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {}
  }
};

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = tokenStorage.get();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export const api = {
  // Health
  async checkHealth() {
    const res = await authFetch('/api/health');
    return res.json();
  },

  // Auth
  async sendOtp(phone: string) {
    const res = await authFetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return res.json();
  },

  async verifyOtp(phone: string, otp: string, role: UserRole = 'CUSTOMER', name?: string) {
    const res = await authFetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, role, name })
    });
    const data = await res.json();
    if (data.success && data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  },

  // Services & Pricing
  async getServices(): Promise<ServiceItem[]> {
    const res = await authFetch('/api/services');
    return res.json();
  },

  async getPricing(): Promise<PricingConfig> {
    const res = await authFetch('/api/pricing');
    return res.json();
  },

  async updatePricing(pricing: Partial<PricingConfig>) {
    const res = await authFetch('/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing)
    });
    return res.json();
  },

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    const res = await authFetch('/api/coupons');
    return res.json();
  },

  async applyCoupon(code: string, bookedHours: number, baseAmount: number) {
    const res = await authFetch('/api/coupons/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, bookedHours, baseAmount })
    });
    return res.json();
  },

  async createCoupon(coupon: Partial<Coupon>) {
    const res = await authFetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coupon)
    });
    return res.json();
  },

  // Bookings
  async getBookings(params?: { customerId?: string; assistantId?: string; status?: string }): Promise<Booking[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await authFetch(`/api/bookings?${query}`);
    return res.json();
  },

  async getBooking(id: string): Promise<Booking> {
    const res = await authFetch(`/api/bookings/${id}`);
    return res.json();
  },

  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    const res = await authFetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async acceptBooking(id: string, assistantId?: string) {
    const res = await authFetch(`/api/bookings/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistantId })
    });
    return res.json();
  },

  async arriveBooking(id: string) {
    const res = await authFetch(`/api/bookings/${id}/arrive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async verifyBookingOtp(id: string, otp: string) {
    const res = await authFetch(`/api/bookings/${id}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    return res.json();
  },

  async extendBookingHours(id: string, extraHours: number) {
    const res = await authFetch(`/api/bookings/${id}/extend-hours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraHours })
    });
    return res.json();
  },

  async completeBooking(id: string) {
    const res = await authFetch(`/api/bookings/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async cancelBooking(id: string, reason: string) {
    const res = await authFetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async rateBooking(id: string, ratingData: { stars: number; comment?: string; feedbackTags?: string[]; isAssistantRating?: boolean }) {
    const res = await authFetch(`/api/bookings/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    return res.json();
  },

  // Assistants
  async getAssistants(params?: { area?: string; status?: string; online?: boolean }): Promise<AssistantProfile[]> {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    const res = await authFetch(`/api/assistants?${query}`);
    return res.json();
  },

  async getAssistant(id: string): Promise<AssistantProfile> {
    const res = await authFetch(`/api/assistants/${id}`);
    return res.json();
  },

  async toggleAssistantOnline(id: string) {
    const res = await authFetch(`/api/assistants/${id}/toggle-online`, {
      method: 'PUT'
    });
    return res.json();
  },

  async updateAssistantStatus(id: string, data: { status?: string; policeVerified?: boolean }) {
    const res = await authFetch(`/api/assistants/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateAssistantLocation(id: string, locationData: { lat: number; lng: number; address?: string; area?: string; heading?: number }) {
    const res = await authFetch(`/api/assistants/${id}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData)
    });
    return res.json();
  },

  // Customers
  async getCustomers(): Promise<CustomerProfile[]> {
    const res = await authFetch('/api/customers');
    return res.json();
  },

  async getCustomer(id: string): Promise<CustomerProfile> {
    const res = await authFetch(`/api/customers/${id}`);
    return res.json();
  },

  async addCustomerAddress(customerId: string, address: { title: string; address: string; landmark?: string; area: string; lat: number; lng: number; isDefault?: boolean }) {
    const res = await authFetch(`/api/customers/${customerId}/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address)
    });
    return res.json();
  },

  // Societies
  async getSocieties(): Promise<Society[]> {
    const res = await authFetch('/api/societies');
    return res.json();
  },

  async createSociety(society: Partial<Society>) {
    const res = await authFetch('/api/societies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(society)
    });
    return res.json();
  },

  async updateSociety(id: string, data: Partial<Society>) {
    const res = await authFetch(`/api/societies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Payments
  async createPaymentOrder(amount: number, bookingId: string) {
    const res = await authFetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bookingId })
    });
    return res.json();
  },

  async verifyPayment(paymentDetails: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string; bookingId: string; paymentMethod?: string }) {
    const res = await authFetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentDetails)
    });
    return res.json();
  },

  // Support
  async getSupportTickets(userId?: string, role?: string): Promise<SupportTicket[]> {
    const query = new URLSearchParams({ userId: userId || '', role: role || '' }).toString();
    const res = await authFetch(`/api/support/tickets?${query}`);
    return res.json();
  },

  async createSupportTicket(ticketData: Partial<SupportTicket>) {
    const res = await authFetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  async replySupportTicket(id: string, replyData: { text: string; senderId: string; senderName: string; senderRole: UserRole; status?: string }) {
    const res = await authFetch(`/api/support/tickets/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData)
    });
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<PlatformAnalytics> {
    const res = await authFetch('/api/analytics');
    return res.json();
  },

  // Admin Seed
  async seedDatabase(force = false) {
    const res = await authFetch(`/api/admin/seed?force=${force}`, { method: 'POST' });
    return res.json();
  },

  // Seed Reset
  async resetSeedData() {
    const res = await authFetch('/api/seed/reset', { method: 'POST' });
    return res.json();
  },

  // Google Maps Platform
  async getMapsConfig(): Promise<{ configured: boolean; apiKey: string | null }> {
    try {
      const res = await authFetch('/api/maps/config');
      return res.json();
    } catch {
      return { configured: false, apiKey: null };
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; area: string; lat: number; lng: number; isFallback?: boolean }> {
    try {
      const res = await authFetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
      return res.json();
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

  async geocodeAddress(address: string): Promise<{ results: Array<{ formattedAddress: string; area: string; lat: number; lng: number; isFallback?: boolean }> }> {
    try {
      const res = await authFetch(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
      return res.json();
    } catch {
      return { results: [] };
    }
  }
};
