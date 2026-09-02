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

export const api = {
  // Auth
  async sendOtp(phone: string) {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return res.json();
  },

  async verifyOtp(phone: string, otp: string, role: UserRole = 'CUSTOMER', name?: string) {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, role, name })
    });
    return res.json();
  },

  // Services & Pricing
  async getServices(): Promise<ServiceItem[]> {
    const res = await fetch('/api/services');
    return res.json();
  },

  async getPricing(): Promise<PricingConfig> {
    const res = await fetch('/api/pricing');
    return res.json();
  },

  async updatePricing(pricing: Partial<PricingConfig>) {
    const res = await fetch('/api/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing)
    });
    return res.json();
  },

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    const res = await fetch('/api/coupons');
    return res.json();
  },

  async applyCoupon(code: string, bookedHours: number, baseAmount: number) {
    const res = await fetch('/api/coupons/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, bookedHours, baseAmount })
    });
    return res.json();
  },

  async createCoupon(coupon: Partial<Coupon>) {
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coupon)
    });
    return res.json();
  },

  // Bookings
  async getBookings(params?: { customerId?: string; assistantId?: string; status?: string }): Promise<Booking[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`/api/bookings?${query}`);
    return res.json();
  },

  async getBooking(id: string): Promise<Booking> {
    const res = await fetch(`/api/bookings/${id}`);
    return res.json();
  },

  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return res.json();
  },

  async acceptBooking(id: string, assistantId?: string) {
    const res = await fetch(`/api/bookings/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistantId })
    });
    return res.json();
  },

  async arriveBooking(id: string) {
    const res = await fetch(`/api/bookings/${id}/arrive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async verifyBookingOtp(id: string, otp: string) {
    const res = await fetch(`/api/bookings/${id}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    return res.json();
  },

  async extendBookingHours(id: string, extraHours: number) {
    const res = await fetch(`/api/bookings/${id}/extend-hours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraHours })
    });
    return res.json();
  },

  async completeBooking(id: string) {
    const res = await fetch(`/api/bookings/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async cancelBooking(id: string, reason: string) {
    const res = await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async rateBooking(id: string, ratingData: { stars: number; comment?: string; feedbackTags?: string[]; isAssistantRating?: boolean }) {
    const res = await fetch(`/api/bookings/${id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingData)
    });
    return res.json();
  },

  // Assistants
  async getAssistants(params?: { area?: string; status?: string; online?: boolean }): Promise<AssistantProfile[]> {
    const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
    const res = await fetch(`/api/assistants?${query}`);
    return res.json();
  },

  async getAssistant(id: string): Promise<AssistantProfile> {
    const res = await fetch(`/api/assistants/${id}`);
    return res.json();
  },

  async toggleAssistantOnline(id: string) {
    const res = await fetch(`/api/assistants/${id}/toggle-online`, {
      method: 'PUT'
    });
    return res.json();
  },

  async updateAssistantStatus(id: string, data: { status?: string; policeVerified?: boolean }) {
    const res = await fetch(`/api/assistants/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateAssistantLocation(id: string, locationData: { lat: number; lng: number; address?: string; area?: string; heading?: number }) {
    const res = await fetch(`/api/assistants/${id}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData)
    });
    return res.json();
  },

  // Customers
  async getCustomers(): Promise<CustomerProfile[]> {
    const res = await fetch('/api/customers');
    return res.json();
  },

  async getCustomer(id: string): Promise<CustomerProfile> {
    const res = await fetch(`/api/customers/${id}`);
    return res.json();
  },

  async addCustomerAddress(customerId: string, address: { title: string; address: string; landmark?: string; area: string; lat: number; lng: number; isDefault?: boolean }) {
    const res = await fetch(`/api/customers/${customerId}/address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address)
    });
    return res.json();
  },

  // Societies
  async getSocieties(): Promise<Society[]> {
    const res = await fetch('/api/societies');
    return res.json();
  },

  async createSociety(society: Partial<Society>) {
    const res = await fetch('/api/societies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(society)
    });
    return res.json();
  },

  async updateSociety(id: string, data: Partial<Society>) {
    const res = await fetch(`/api/societies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Payments
  async createPaymentOrder(amount: number, bookingId: string) {
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bookingId })
    });
    return res.json();
  },

  async verifyPayment(paymentDetails: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature?: string; bookingId: string; paymentMethod?: string }) {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentDetails)
    });
    return res.json();
  },

  // Support
  async getSupportTickets(userId?: string, role?: string): Promise<SupportTicket[]> {
    const query = new URLSearchParams({ userId: userId || '', role: role || '' }).toString();
    const res = await fetch(`/api/support/tickets?${query}`);
    return res.json();
  },

  async createSupportTicket(ticketData: Partial<SupportTicket>) {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  async replySupportTicket(id: string, replyData: { text: string; senderId: string; senderName: string; senderRole: UserRole; status?: string }) {
    const res = await fetch(`/api/support/tickets/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData)
    });
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<PlatformAnalytics> {
    const res = await fetch('/api/analytics');
    return res.json();
  },

  // Seed Reset
  async resetSeedData() {
    const res = await fetch('/api/seed/reset', { method: 'POST' });
    return res.json();
  }
};
