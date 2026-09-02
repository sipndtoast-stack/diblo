export type UserRole = 'CUSTOMER' | 'ASSISTANT' | 'ADMIN' | 'OPERATIONS';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  title: string; // 'Home', 'Office', 'Parents', 'Other'
  address: string;
  landmark?: string;
  area: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  savedAddresses: SavedAddress[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  familyMembers?: {
    name: string;
    relationship: string;
    phone?: string;
    notes?: string;
  }[];
  referralCode: string;
  walletBalance: number;
  createdAt: string;
}

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';

export interface AssistantDocument {
  id: string;
  type: 'AADHAAR' | 'PAN' | 'POLICE_VERIFICATION' | 'ADDRESS_PROOF' | 'BANK_PASSBOOK';
  documentNumber: string;
  fileUrl: string;
  verified: boolean;
  uploadedAt: string;
}

export interface AssistantProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  photo: string;
  rating: number;
  totalRatings: number;
  verificationStatus: VerificationStatus;
  policeVerified: boolean;
  languages: string[];
  serviceCapabilities: string[]; // Service IDs
  serviceArea: string[]; // e.g. ['Bandra', 'Andheri', 'Powai', 'Colaba', 'Dadar']
  isOnline: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    area: string;
    lastUpdated: string;
    heading?: number;
  };
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
    pendingPayout: number;
  };
  documents: AssistantDocument[];
  bankDetails: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
    accountHolder: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  completedTasksCount: number;
  acceptanceRate: number;
  activeBookingId?: string | null;
  joinedDate: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: 'DAILY_CHORES' | 'CARE_COMPANION' | 'OFFICE_GOVT' | 'HEALTH_PHARMACY' | 'SPECIAL';
  icon: string;
  baseHourlyRate: number;
  minimumHours: number;
  popular?: boolean;
  features: string[];
  recommendedFor: string[];
  isActive: boolean;
}

export type BookingStatus =
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'OTP_VERIFIED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookingLocation {
  address: string;
  landmark?: string;
  area: string;
  lat: number;
  lng: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  location: BookingLocation;
  destinationLocation?: BookingLocation;
  dateType: 'TODAY' | 'TOMORROW' | 'CUSTOM';
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  bookedHours: number;
  additionalHours: number;
  totalHours: number;
  hourlyRate: number;
  baseAmount: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  totalAmount: number;
  instructions?: string;
  specialRequirements?: string;
  contactPerson?: {
    name: string;
    phone: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
  };
  genderPreference: 'ANY' | 'MALE' | 'FEMALE';
  status: BookingStatus;
  assistantId?: string | null;
  assistantName?: string | null;
  assistantPhone?: string | null;
  assistantPhoto?: string | null;
  assistantRating?: number;
  assistantLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  startOtp: string; // 4 or 6 digit OTP given to customer, verified by assistant
  paymentId?: string;
  orderId?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  paymentMethod?: string;
  invoiceNumber?: string;
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  timerElapsedSeconds?: number;
  rating?: {
    stars: number;
    comment?: string;
    customerFeedbackTags?: string[];
    createdAt: string;
  };
  assistantRatingForCustomer?: {
    stars: number;
    comment?: string;
    createdAt: string;
  };
  cancellationReason?: string;
}

export type SocietyStatus =
  | 'LEAD'
  | 'CONTACTED'
  | 'MEETING_SCHEDULED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'PARTNERED'
  | 'INACTIVE';

export interface Society {
  id: string;
  name: string;
  address: string;
  area: string;
  pinCode: string;
  secretaryName: string;
  managerName: string;
  contactPhone: string;
  contactEmail: string;
  residentsCount: number;
  partnershipStatus: SocietyStatus;
  agreementStatus: 'NOT_STARTED' | 'DRAFT' | 'SIGNED' | 'EXPIRED';
  assignedAssistantsCount: number;
  bookingsCount: number;
  revenueGenerated: number;
  notes?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage?: number;
  flatDiscount?: number;
  maxDiscount: number;
  minBookingHours: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  description: string;
}

export interface PricingConfig {
  baseHourlyPrice: number;
  minimumBookingHours: number;
  additionalHourPrice: number;
  peakHourMultiplier: number;
  weekendMultiplier: number;
  taxesPercentage: number;
  currency: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  userRole: UserRole;
  bookingId?: string;
  category: 'BOOKING_ISSUE' | 'ASSISTANT_BEHAVIOR' | 'PAYMENT_REFUND' | 'SAFETY_EMERGENCY' | 'GENERAL_INQUIRY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  subject: string;
  description: string;
  attachments?: string[];
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'BOOKING' | 'PAYMENT' | 'ASSISTANT' | 'SUPPORT' | 'PROMO';
  bookingId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformAnalytics {
  totalCustomers: number;
  activeBookings: number;
  todayBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  activeAssistants: number;
  totalAssistants: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingPayments: number;
  averageRating: number;
  conversionRate: number;
  repeatCustomerRate: number;
  assistantAcceptanceRate: number;
  servicePopularity: { name: string; count: number; revenue: number }[];
  dailyTrends: { date: string; bookings: number; revenue: number }[];
  areaBreakdown: { area: string; bookings: number; assistants: number }[];
}
