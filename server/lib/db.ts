import { initializeFirebaseAdmin } from './firebaseAdmin';
import { Query } from 'firebase-admin/firestore';
import {
  SERVICES,
  MOCK_CUSTOMERS,
  MOCK_ASSISTANTS,
  MOCK_BOOKINGS,
  MOCK_SOCIETIES,
  MOCK_COUPONS,
  MOCK_REFERRALS,
  MOCK_SUPPORT_TICKETS,
  INITIAL_PRICING
} from '../../src/data/mockData';
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
  User,
  AssistantApplication,
  EmergencyAlert
} from '../../src/types';

// In-Memory fallback store
let memoryPricing: PricingConfig = { ...INITIAL_PRICING };
let memoryBookings: Booking[] = [...MOCK_BOOKINGS];
let memoryAssistants: AssistantProfile[] = [...MOCK_ASSISTANTS];
let memoryCustomers: CustomerProfile[] = [...MOCK_CUSTOMERS];
let memorySocieties: Society[] = [...MOCK_SOCIETIES];
let memoryCoupons: Coupon[] = [...MOCK_COUPONS];
let memoryReferrals: Referral[] = [...MOCK_REFERRALS];
let memorySupportTickets: SupportTicket[] = [...MOCK_SUPPORT_TICKETS];
let memoryEmergencyAlerts: EmergencyAlert[] = [
  {
    id: 'sos-init-1',
    alertNumber: 'SOS-2026-911',
    userId: 'user-c-1',
    userName: 'Aarav Mehta',
    userPhone: '9820123456',
    userRole: 'CUSTOMER',
    bookingId: 'bk-101',
    serviceName: 'Senior Citizen Assistance',
    status: 'ACTIVE',
    lat: 19.0596,
    lng: 72.8295,
    address: 'Carter Road, Bandra West, Mumbai',
    accuracy: 12,
    triggerSource: 'CUSTOMER_HEADER_SOS',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString()
  }
];
let memoryServices: ServiceItem[] = [...SERVICES];
let memoryApplications: AssistantApplication[] = [
  {
    id: 'app-1',
    applicationNumber: 'DIBLO-APP-1001',
    fullName: 'Sunil Jadhav',
    mobileNumber: '9819283746',
    email: 'sunil.jadhav@gmail.com',
    dateOfBirth: '1995-04-12',
    gender: 'MALE',
    currentAddress: 'Room 14, Chawl No 3, Khar Danda, Khar West, Mumbai',
    permanentAddress: 'Room 14, Chawl No 3, Khar Danda, Khar West, Mumbai',
    mumbaiArea: 'Bandra West',
    pinCode: '400052',
    aadhaarNumber: '482910394821',
    panNumber: 'ABCDE1234F',
    languagesSpoken: ['Hindi', 'Marathi', 'English'],
    selectedServices: ['Senior Citizen Assistance', 'Shopping & Market Escort', 'Hospital Visit OPD Queue'],
    yearsOfExperience: 3,
    preferredOperatingZones: ['Bandra West', 'Khar West', 'Santacruz West'],
    availabilityType: 'FULL_TIME',
    preferredTimeSlots: ['Morning (08:00 AM - 02:00 PM)', 'Evening (02:00 PM - 08:00 PM)'],
    hasTwoWheeler: true,
    drivingLicenseNumber: 'MH02-20160029381',
    emergencyContactName: 'Kavita Jadhav',
    emergencyContactPhone: '9819283740',
    emergencyContactRelation: 'Spouse',
    hasCriminalRecord: false,
    bankAccountNumber: '50100234891023',
    bankIfscCode: 'HDFC0000123',
    bankName: 'HDFC Bank',
    accountHolderName: 'Sunil Jadhav',
    termsAccepted: true,
    codeOfConductAccepted: true,
    status: 'PENDING_REVIEW',
    appliedAt: '2026-09-15T11:30:00Z'
  }
];
let memoryUsers: User[] = [
  {
    id: 'user-c-1',
    name: 'Aarav Mehta',
    phone: '9820123456',
    email: 'aarav.mehta@gmail.com',
    role: 'CUSTOMER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 'user-a-1',
    name: 'Rajesh Sharma',
    phone: '9820554433',
    email: 'rajesh.sharma@diblo.in',
    role: 'ASSISTANT',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    createdAt: '2025-10-15T10:00:00Z'
  },
  {
    id: 'user-admin-1',
    name: 'Kabir Varma',
    phone: '9820001122',
    email: 'admin@diblo.in',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 'user-ops-1',
    name: 'Sneha Kulkarni',
    phone: '9820003344',
    email: 'ops.mumbai@diblo.in',
    role: 'OPERATIONS',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-06-01T00:00:00Z'
  }
];

export const dbRepository = {
  // ----------------------------------------------------
  // PRICING
  // ----------------------------------------------------
  async getPricing(): Promise<PricingConfig> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('pricing').doc('config').get();
        if (doc.exists) {
          return doc.data() as PricingConfig;
        }
      } catch (err) {
        console.error('[DB] Failed to fetch pricing from Firestore:', err);
      }
    }
    return memoryPricing;
  },

  async updatePricing(pricing: Partial<PricingConfig>): Promise<PricingConfig> {
    const updated = { ...memoryPricing, ...pricing };
    memoryPricing = updated;

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('pricing').doc('config').set(updated, { merge: true });
      } catch (err) {
        console.error('[DB] Failed to persist pricing in Firestore:', err);
      }
    }
    return updated;
  },

  // ----------------------------------------------------
  // SERVICES
  // ----------------------------------------------------
  async getServices(): Promise<ServiceItem[]> {
    const pricing = await this.getPricing();
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('services').get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => ({
            ...(d.data() as ServiceItem),
            id: d.id,
            baseHourlyRate: pricing.baseHourlyPrice,
            minimumHours: pricing.minimumBookingHours
          }));
        }
      } catch (err) {
        console.error('[DB] Failed to fetch services from Firestore:', err);
      }
    }
    return memoryServices.map((s) => ({
      ...s,
      baseHourlyRate: pricing.baseHourlyPrice,
      minimumHours: pricing.minimumBookingHours
    }));
  },

  // ----------------------------------------------------
  // USERS
  // ----------------------------------------------------
  async getUser(id: string): Promise<User | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('users').doc(id).get();
        if (doc.exists) return { id: doc.id, ...(doc.data() as any) };
      } catch (err) {
        console.error('[DB] Error getting user:', err);
      }
    }
    return memoryUsers.find((u) => u.id === id) || null;
  },

  async getUserById(id: string): Promise<User | null> {
    return this.getUser(id);
  },

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...(doc.data() as any) };
        }
      } catch (err) {
        console.error('[DB] Error finding user by email:', err);
      }
    }
    return memoryUsers.find((u) => (u as any).email?.toLowerCase() === email.toLowerCase()) || null;
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('users').where('phone', '==', phone).limit(1).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...(doc.data() as any) };
        }
      } catch (err) {
        console.error('[DB] Error finding user by phone:', err);
      }
    }
    return memoryUsers.find((u) => u.phone === phone) || null;
  },

  async saveUser(user: User): Promise<User> {
    const existingIndex = memoryUsers.findIndex((u) => u.id === user.id || u.phone === user.phone);
    if (existingIndex >= 0) {
      memoryUsers[existingIndex] = { ...memoryUsers[existingIndex], ...user };
    } else {
      memoryUsers.push(user);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('users').doc(user.id).set(user, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving user to Firestore:', err);
      }
    }
    return user;
  },

  // ----------------------------------------------------
  // CUSTOMERS
  // ----------------------------------------------------
  async getCustomers(): Promise<CustomerProfile[]> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('customers').get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error getting customers:', err);
      }
    }
    return memoryCustomers;
  },

  async getCustomer(idOrUserId: string): Promise<CustomerProfile | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('customers').doc(idOrUserId).get();
        if (doc.exists) return { id: doc.id, ...(doc.data() as any) };

        const byUser = await db.collection('customers').where('userId', '==', idOrUserId).limit(1).get();
        if (!byUser.empty) {
          const d = byUser.docs[0];
          return { id: d.id, ...(d.data() as any) };
        }
      } catch (err) {
        console.error('[DB] Error fetching customer:', err);
      }
    }
    return memoryCustomers.find((c) => c.id === idOrUserId || c.userId === idOrUserId) || null;
  },

  async getCustomerByUserId(userId: string): Promise<CustomerProfile | null> {
    return this.getCustomer(userId);
  },

  async saveCustomer(customer: CustomerProfile): Promise<CustomerProfile> {
    const idx = memoryCustomers.findIndex((c) => c.id === customer.id || c.phone === customer.phone);
    if (idx >= 0) {
      memoryCustomers[idx] = { ...memoryCustomers[idx], ...customer };
    } else {
      memoryCustomers.push(customer);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('customers').doc(customer.id).set(customer, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving customer:', err);
      }
    }
    return customer;
  },

  // ----------------------------------------------------
  // ASSISTANTS
  // ----------------------------------------------------
  async getAssistants(filters?: { area?: string; status?: string; online?: boolean }): Promise<AssistantProfile[]> {
    let list = [...memoryAssistants];
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('assistants').get();
        if (!snapshot.empty) {
          list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching assistants:', err);
      }
    }

    if (filters?.area) {
      list = list.filter((a) => a.serviceArea.some((sa) => sa.toLowerCase().includes(filters.area!.toLowerCase())));
    }
    if (filters?.status) {
      list = list.filter((a) => a.verificationStatus === filters.status);
    }
    if (filters?.online !== undefined) {
      list = list.filter((a) => a.isOnline === filters.online);
    }
    return list;
  },

  async getAssistant(idOrUserId: string): Promise<AssistantProfile | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('assistants').doc(idOrUserId).get();
        if (doc.exists) return { id: doc.id, ...(doc.data() as any) };

        const byUser = await db.collection('assistants').where('userId', '==', idOrUserId).limit(1).get();
        if (!byUser.empty) {
          const d = byUser.docs[0];
          return { id: d.id, ...(d.data() as any) };
        }
      } catch (err) {
        console.error('[DB] Error fetching assistant:', err);
      }
    }
    return memoryAssistants.find((a) => a.id === idOrUserId || a.userId === idOrUserId) || null;
  },

  async getAssistantByUserId(userId: string): Promise<AssistantProfile | null> {
    return this.getAssistant(userId);
  },

  async saveAssistant(assistant: AssistantProfile): Promise<AssistantProfile> {
    const idx = memoryAssistants.findIndex((a) => a.id === assistant.id || a.phone === assistant.phone);
    if (idx >= 0) {
      memoryAssistants[idx] = { ...memoryAssistants[idx], ...assistant };
    } else {
      memoryAssistants.push(assistant);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('assistants').doc(assistant.id).set(assistant, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving assistant:', err);
      }
    }
    return assistant;
  },

  // ----------------------------------------------------
  // BOOKINGS
  // ----------------------------------------------------
  async getBookings(filters?: { customerId?: string; assistantId?: string; status?: string }): Promise<Booking[]> {
    let list = [...memoryBookings];
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        let query: Query = db.collection('bookings');
        if (filters?.customerId) {
          query = query.where('customerId', '==', filters.customerId);
        }
        if (filters?.assistantId) {
          query = query.where('assistantId', '==', filters.assistantId);
        }
        if (filters?.status) {
          query = query.where('status', '==', filters.status);
        }
        const snapshot = await query.get();
        if (!snapshot.empty) {
          list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching bookings:', err);
      }
    }

    // Safe timestamp extractor
    const getTimestamp = (val: any) => {
      if (!val) return 0;
      if (typeof val?.toDate === 'function') {
        try { return val.toDate().getTime(); } catch { return 0; }
      }
      if (typeof val === 'number') return val;
      const parsed = new Date(val).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    // Sort newest first
    list = (list || []).filter(Boolean);
    list.sort((a, b) => getTimestamp(b?.createdAt) - getTimestamp(a?.createdAt));
    return list;
  },

  async getBooking(id: string): Promise<Booking | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('bookings').doc(id).get();
        if (doc.exists) return { id: doc.id, ...(doc.data() as any) };
      } catch (err) {
        console.error('[DB] Error fetching booking by id:', err);
      }
    }
    return memoryBookings.find((b) => b.id === id) || null;
  },

  async saveBooking(booking: Booking): Promise<Booking> {
    const idx = memoryBookings.findIndex((b) => b.id === booking.id);
    if (idx >= 0) {
      memoryBookings[idx] = { ...memoryBookings[idx], ...booking };
    } else {
      memoryBookings.unshift(booking);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('bookings').doc(booking.id).set(booking, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving booking:', err);
      }
    }
    return booking;
  },

  // ----------------------------------------------------
  // COUPONS
  // ----------------------------------------------------
  async getCoupons(): Promise<Coupon[]> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('coupons').get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching coupons:', err);
      }
    }
    return memoryCoupons;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const idx = memoryCoupons.findIndex((c) => c.id === coupon.id || c.code === coupon.code);
    if (idx >= 0) {
      memoryCoupons[idx] = { ...memoryCoupons[idx], ...coupon };
    } else {
      memoryCoupons.push(coupon);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('coupons').doc(coupon.id).set(coupon, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving coupon:', err);
      }
    }
    return coupon;
  },

  // ----------------------------------------------------
  // REFERRALS & REWARDS
  // ----------------------------------------------------
  async getReferrals(customerId?: string): Promise<Referral[]> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        let query: any = db.collection('referrals');
        if (customerId) {
          query = query.where('referrerCustomerId', '==', customerId);
        }
        const snapshot = await query.get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching referrals:', err);
      }
    }
    if (customerId) {
      return memoryReferrals.filter((r) => r.referrerCustomerId === customerId);
    }
    return memoryReferrals;
  },

  async saveReferral(referral: Referral): Promise<Referral> {
    const idx = memoryReferrals.findIndex((r) => r.id === referral.id);
    if (idx >= 0) {
      memoryReferrals[idx] = { ...memoryReferrals[idx], ...referral };
    } else {
      memoryReferrals.unshift(referral);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('referrals').doc(referral.id).set(referral, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving referral:', err);
      }
    }
    return referral;
  },

  // ----------------------------------------------------
  // SOCIETIES
  // ----------------------------------------------------
  async getSocieties(): Promise<Society[]> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('societies').get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching societies:', err);
      }
    }
    return memorySocieties;
  },

  async saveSociety(society: Society): Promise<Society> {
    const idx = memorySocieties.findIndex((s) => s.id === society.id);
    if (idx >= 0) {
      memorySocieties[idx] = { ...memorySocieties[idx], ...society };
    } else {
      memorySocieties.push(society);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('societies').doc(society.id).set(society, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving society:', err);
      }
    }
    return society;
  },

  // ----------------------------------------------------
  // SUPPORT TICKETS
  // ----------------------------------------------------
  async getSupportTickets(filters?: { userId?: string; role?: string }): Promise<SupportTicket[]> {
    let list = [...memorySupportTickets];
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('supportTickets').get();
        if (!snapshot.empty) {
          list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching support tickets:', err);
      }
    }

    if (filters?.userId && filters.role !== 'ADMIN' && filters.role !== 'OPERATIONS') {
      list = list.filter((t) => t.userId === filters.userId);
    }
    return list;
  },

  async saveSupportTicket(ticket: SupportTicket): Promise<SupportTicket> {
    const idx = memorySupportTickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) {
      memorySupportTickets[idx] = { ...memorySupportTickets[idx], ...ticket };
    } else {
      memorySupportTickets.unshift(ticket);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('supportTickets').doc(ticket.id).set(ticket, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving support ticket:', err);
      }
    }
    return ticket;
  },

  // ----------------------------------------------------
  // EMERGENCY SOS ALERTS
  // ----------------------------------------------------
  async getEmergencyAlerts(): Promise<EmergencyAlert[]> {
    let list = [...memoryEmergencyAlerts];
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('emergencyAlerts').get();
        if (!snapshot.empty) {
          list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }
      } catch (err) {
        console.error('[DB] Error fetching emergency alerts from Firestore:', err);
      }
    }
    // Return newest first, prioritizing ACTIVE
    return list.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  },

  async saveEmergencyAlert(alert: EmergencyAlert): Promise<EmergencyAlert> {
    const idx = memoryEmergencyAlerts.findIndex((a) => a.id === alert.id);
    if (idx >= 0) {
      memoryEmergencyAlerts[idx] = { ...memoryEmergencyAlerts[idx], ...alert };
    } else {
      memoryEmergencyAlerts.unshift(alert);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('emergencyAlerts').doc(alert.id).set(alert, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving emergency alert to Firestore:', err);
      }
    }
    return alert;
  },

  async getEmergencyAlertById(id: string): Promise<EmergencyAlert | null> {
    const alerts = await this.getEmergencyAlerts();
    return alerts.find((a) => a.id === id) || null;
  },

  // ----------------------------------------------------
  // PAYMENTS
  // ----------------------------------------------------
  async recordPayment(payment: {
    id: string;
    bookingId: string;
    orderId: string;
    paymentId: string;
    amountPaise: number;
    currency: string;
    status: string;
    signatureVerified: boolean;
    paymentMethod?: string;
    createdAt: string;
  }) {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('payments').doc(payment.id).set(payment, { merge: true });
      } catch (err) {
        console.error('[DB] Error recording payment in Firestore:', err);
      }
    }
  },

  // ----------------------------------------------------
  // ASSISTANT APPLICATIONS (ONBOARDING PIPELINE)
  // ----------------------------------------------------
  async getApplications(): Promise<AssistantApplication[]> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const snapshot = await db.collection('assistantApplications').orderBy('appliedAt', 'desc').get();
        if (!snapshot.empty) {
          return snapshot.docs.map((d) => d.data() as AssistantApplication);
        }
      } catch (err) {
        console.error('[DB] Error fetching assistant applications from Firestore:', err);
      }
    }
    return memoryApplications;
  },

  async getApplicationById(id: string): Promise<AssistantApplication | null> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        const doc = await db.collection('assistantApplications').doc(id).get();
        if (doc.exists) {
          return doc.data() as AssistantApplication;
        }
      } catch (err) {
        console.error('[DB] Error fetching application from Firestore:', err);
      }
    }
    return memoryApplications.find((a) => a.id === id || a.applicationNumber === id) || null;
  },

  async saveApplication(appData: AssistantApplication): Promise<AssistantApplication> {
    const idx = memoryApplications.findIndex((a) => a.id === appData.id);
    if (idx >= 0) {
      memoryApplications[idx] = { ...memoryApplications[idx], ...appData };
    } else {
      memoryApplications.unshift(appData);
    }

    const { isInitialized, db } = initializeFirebaseAdmin();
    if (isInitialized && db) {
      try {
        await db.collection('assistantApplications').doc(appData.id).set(appData, { merge: true });
      } catch (err) {
        console.error('[DB] Error saving assistant application in Firestore:', err);
      }
    }
    return appData;
  },

  // ----------------------------------------------------
  // DATABASE SEEDING
  // ----------------------------------------------------
  async seedDatabase(force = false): Promise<{ seeded: boolean; counts: Record<string, number> }> {
    const { isInitialized, db } = initializeFirebaseAdmin();
    if (!isInitialized || !db) {
      // Seed in-memory
      memoryPricing = { ...INITIAL_PRICING };
      memoryBookings = [...MOCK_BOOKINGS];
      memoryAssistants = [...MOCK_ASSISTANTS];
      memoryCustomers = [...MOCK_CUSTOMERS];
      memorySocieties = [...MOCK_SOCIETIES];
      memoryCoupons = [...MOCK_COUPONS];
      memorySupportTickets = [...MOCK_SUPPORT_TICKETS];
      memoryServices = [...SERVICES];
      return {
        seeded: true,
        counts: {
          services: memoryServices.length,
          assistants: memoryAssistants.length,
          customers: memoryCustomers.length,
          bookings: memoryBookings.length,
          societies: memorySocieties.length,
          coupons: memoryCoupons.length,
          supportTickets: memorySupportTickets.length
        }
      };
    }

    try {
      // Check if already seeded unless forced
      if (!force) {
        const check = await db.collection('services').limit(1).get();
        if (!check.empty) {
          return { seeded: false, counts: { message: 0 } };
        }
      }

      const batch = db.batch();

      // Pricing
      batch.set(db.collection('pricing').doc('config'), INITIAL_PRICING);

      // Services
      for (const service of SERVICES) {
        batch.set(db.collection('services').doc(service.id), service);
      }

      // Customers
      for (const customer of MOCK_CUSTOMERS) {
        batch.set(db.collection('customers').doc(customer.id), customer);
      }

      // Assistants
      for (const assistant of MOCK_ASSISTANTS) {
        batch.set(db.collection('assistants').doc(assistant.id), assistant);
      }

      // Bookings
      for (const booking of MOCK_BOOKINGS) {
        batch.set(db.collection('bookings').doc(booking.id), booking);
      }

      // Societies
      for (const society of MOCK_SOCIETIES) {
        batch.set(db.collection('societies').doc(society.id), society);
      }

      // Coupons
      for (const coupon of MOCK_COUPONS) {
        batch.set(db.collection('coupons').doc(coupon.id), coupon);
      }

      // Support Tickets
      for (const ticket of MOCK_SUPPORT_TICKETS) {
        batch.set(db.collection('supportTickets').doc(ticket.id), ticket);
      }

      // Users
      for (const user of memoryUsers) {
        batch.set(db.collection('users').doc(user.id), user);
      }

      await batch.commit();
      console.log('[DB] Firestore successfully seeded with Diblo initial data');

      return {
        seeded: true,
        counts: {
          services: SERVICES.length,
          customers: MOCK_CUSTOMERS.length,
          assistants: MOCK_ASSISTANTS.length,
          bookings: MOCK_BOOKINGS.length,
          societies: MOCK_SOCIETIES.length,
          coupons: MOCK_COUPONS.length,
          supportTickets: MOCK_SUPPORT_TICKETS.length
        }
      };
    } catch (err) {
      console.error('[DB] Seeding error:', err);
      throw err;
    }
  }
};
