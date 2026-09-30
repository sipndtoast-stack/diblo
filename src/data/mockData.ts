import {
  ServiceItem,
  AssistantProfile,
  CustomerProfile,
  Booking,
  Society,
  Coupon,
  Referral,
  PricingConfig,
  SupportTicket,
  PlatformAnalytics
} from '../types';

export const INITIAL_PRICING: PricingConfig = {
  baseHourlyPrice: 149,
  minimumBookingHours: 2,
  additionalHourPrice: 149,
  peakHourMultiplier: 1.0,
  weekendMultiplier: 1.0,
  taxesPercentage: 5,
  currency: 'INR'
};

export const SERVICES: ServiceItem[] = [
  {
    id: 'shopping-assistance',
    title: 'Shopping Assistance',
    tagline: 'Grocery, apparel, market & festival shopping help',
    description: 'Trained assistants to accompany you or execute shopping at local markets, supermarkets, malls, or wholesale bazaars with careful item selection and bill handling.',
    category: 'DAILY_CHORES',
    icon: 'ShoppingBag',
    baseHourlyRate: 149,
    minimumHours: 2,
    popular: true,
    features: ['Luggage & bags handling', 'Supermarket & local mandi', 'Quality check on fruits/groceries', 'Bill verification'],
    recommendedFor: ['Heavy grocery shopping', 'Festival prep', 'Apparel trials', 'Exchange/returns'],
    isActive: true
  },
  {
    id: 'senior-citizen-assistance',
    title: 'Senior Citizen Assistance',
    tagline: 'Compassionate companion for elders',
    description: 'Empathetic, police-verified assistants to accompany seniors for evening walks, doctor visits, park strolls, reading, and routine tasks with utmost patience.',
    category: 'CARE_COMPANION',
    icon: 'HeartHandshake',
    baseHourlyRate: 149,
    minimumHours: 2,
    popular: true,
    features: ['Gentle walking accompaniment', 'Emergency first-aid trained', 'Tech & smartphone guidance', 'Patience & respect first'],
    recommendedFor: ['Elderly parents living alone', 'Morning/evening strolls', 'Social visits', 'Routine companion'],
    isActive: true
  },
  {
    id: 'hospital-visit-assistance',
    title: 'Hospital Visit Assistance',
    tagline: 'OPD queue management & patient escort',
    description: 'Dedicated assistant to stand in hospital OPD registration queues, manage medical files, collect test reports, push wheelchairs, and coordinate pharmacy receipts.',
    category: 'HEALTH_PHARMACY',
    icon: 'Stethoscope',
    baseHourlyRate: 149,
    minimumHours: 2,
    popular: true,
    features: ['OPD registration queue standing', 'Diagnostic report collection', 'Wheelchair assistance', 'Pharmacy medicine pickup'],
    recommendedFor: ['Lilavati, Hinduja, Kokilaben, KEM visits', 'Diagnostic center tests', 'Dialysis appointments'],
    isActive: true
  },
  {
    id: 'personal-errand-assistance',
    title: 'Personal Errand Assistance',
    tagline: 'Dry cleaning, keys, tailoring & local errands',
    description: 'Trustworthy hands to collect dry-cleaning, drop tailor measurements, deliver spare keys, pick up bespoke items, or coordinate courier drops across Mumbai.',
    category: 'DAILY_CHORES',
    icon: 'Clock',
    baseHourlyRate: 149,
    minimumHours: 2,
    popular: true,
    features: ['Dry cleaning & laundry run', 'Tailoring & alteration drop', 'Spare keys delivery', 'Local courier coordination'],
    recommendedFor: ['Busy professionals', 'Housewives managing multiple errands', 'Remote coordination'],
    isActive: true
  },
  {
    id: 'queue-standing-assistance',
    title: 'Queue Standing Assistance',
    tagline: 'Temple darshan, tickets & sale queues',
    description: 'Never waste precious hours in long lines. A Diblo assistant stands in queue for temple tokens, cinema premieres, exclusive flash sales, or admissions.',
    category: 'SPECIAL',
    icon: 'Users',
    baseHourlyRate: 149,
    minimumHours: 2,
    popular: true,
    features: ['Siddhivinayak / Lalbaugcha queue', 'Concert & event token line', 'School admission queue', 'Live spot handoff'],
    recommendedFor: ['Religious festivals', 'High-demand ticketing', 'Government counter queues'],
    isActive: true
  },
  {
    id: 'government-office-assistance',
    title: 'Government Office Assistance',
    tagline: 'RTO, BMC, Aadhaar & Ward office guidance',
    description: 'Experienced assistants to help navigate BMC ward offices, RTO counters, Sub-Registrar offices, Aadhaar update centers, and document counters.',
    category: 'OFFICE_GOVT',
    icon: 'Landmark',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Token queue management', 'Document file organization', 'Counter escort', 'Challan payment support'],
    recommendedFor: ['Driving licence renewal', 'Property tax counter', 'Passport seva kendra escort'],
    isActive: true
  },
  {
    id: 'bank-office-assistance',
    title: 'Bank/Office Assistance',
    tagline: 'Cheque deposits, KYC, notarization & branch errands',
    description: 'Reliable assistant to escort you to bank branches, wait for banker appointments, assist senior citizens with pensioner KYC submissions, and stamp duty errands.',
    category: 'OFFICE_GOVT',
    icon: 'Building2',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Life certificate / Jeevan Praman KYC', 'Cheque deposit slip counter', 'Notary & stamp vendor queue', 'Passbook updating'],
    recommendedFor: ['Senior citizen banking', 'Business owners needing courier/bank coordination'],
    isActive: true
  },
  {
    id: 'document-paperwork-assistance',
    title: 'Document & Paperwork Assistance',
    tagline: 'Photocopying, scanning, spiral binding & file organization',
    description: 'Get all your important documents sorted, scanned, photocopied, indexed, and neatly bound at nearby printing centers without wasting your workday.',
    category: 'OFFICE_GOVT',
    icon: 'FileText',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Xerox & high-res scanning', 'Lamination & spiral binding', 'Form filling guidance', 'Docket preparation'],
    recommendedFor: ['Visa application prep', 'College submissions', 'Legal case indexing'],
    isActive: true
  },
  {
    id: 'medicine-pharmacy-assistance',
    title: 'Medicine/Pharmacy Assistance',
    tagline: 'Prescription lookup, rare medicine search & pickup',
    description: 'Can’t find a vital medicine in your local chemist? Diblo assistants visit specialized pharmacies, cancer pharmacies, or surgical stores across Mumbai.',
    category: 'HEALTH_PHARMACY',
    icon: 'Pill',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Prescription fulfillment', 'Multi-chemist search', 'Surgical supplies pickup', 'Immediate doorstep delivery'],
    recommendedFor: ['Urgent medicine requirements', 'Elderly patients', 'Chronic medicine refills'],
    isActive: true
  },
  {
    id: 'appointment-assistance',
    title: 'Appointment Assistance',
    tagline: 'Doctor clinics, salon visits & therapy escort',
    description: 'Punctual assistant to accompany you to clinics, physiotherapy centers, counseling sessions, or salons, ensuring safe travel and smooth wait times.',
    category: 'CARE_COMPANION',
    icon: 'CalendarCheck',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Cab escort & door-to-door safety', 'Waiting room companion', 'Bag & folder holding', 'Post-procedure escort'],
    recommendedFor: ['Post-dental or eye checkups', 'Physiotherapy visits', 'Special needs accompaniment'],
    isActive: true
  },
  {
    id: 'companion-assistance',
    title: 'Companion Assistance',
    tagline: 'Safe, polite escort for walks, dining & events',
    description: 'Need a respectful, vetted companion for an art exhibition, classical music concert, shopping promenade, or dinner outing? Diblo offers trusted company.',
    category: 'CARE_COMPANION',
    icon: 'UserCheck',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Safe evening transit escort', 'Museum & cultural event company', 'Social gathering assistance', 'Pleasant & respectful conversation'],
    recommendedFor: ['Solo travelers in Mumbai', 'Seniors seeking cultural outing partners', 'Event accompaniment'],
    isActive: true
  },
  {
    id: 'local-task-assistance',
    title: 'Local Task Assistance',
    tagline: 'Handyman supervision, home inspection & vendor coordination',
    description: 'Have AC repair technicians, pest control, or painters coming over but you are stuck at work? Have a trusted Diblo assistant supervise on your behalf.',
    category: 'DAILY_CHORES',
    icon: 'Wrench',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Handyman & technician supervision', 'Flat inspection verification', 'Key handover to society security', 'Live video updates'],
    recommendedFor: ['Working couples', 'NRI landlords', 'Home renovation supervision'],
    isActive: true
  },
  {
    id: 'other-personal-tasks',
    title: 'Other Personal Tasks',
    tagline: 'Custom on-demand urban assistance',
    description: 'Any legitimate, safe, and permitted human assistance you need anywhere in Mumbai. Specify your custom requirements and Diblo will handle it.',
    category: 'SPECIAL',
    icon: 'Sparkles',
    baseHourlyRate: 149,
    minimumHours: 2,
    features: ['Custom instruction execution', 'Real-time phone/chat updates', 'Flexible hourly booking', 'Verified personnel'],
    recommendedFor: ['Unique one-time requests', 'Specialized personal assistance', 'Multi-stop errands'],
    isActive: true
  }
];

export const MOCK_CUSTOMERS: CustomerProfile[] = [];

export const MOCK_ASSISTANTS: AssistantProfile[] = [];

export const MOCK_BOOKINGS: Booking[] = [];

export const MOCK_SOCIETIES: Society[] = [
  {
    id: 'soc-1',
    name: 'Hiranandani Gardens',
    address: 'Central Avenue, Powai',
    area: 'Powai',
    pinCode: '400076',
    secretaryName: 'Niranjan Hiranandani / R. K. Nair',
    managerName: 'Girish Menon',
    contactPhone: '9820119988',
    contactEmail: 'estate.powai@hiranandani.net',
    residentsCount: 4200,
    partnershipStatus: 'PARTNERED',
    agreementStatus: 'SIGNED',
    assignedAssistantsCount: 12,
    bookingsCount: 384,
    revenueGenerated: 124800,
    notes: 'Dedicated Diblo desk near clubhouse; exclusive 10% discount for residents with code HIRANANDANI10.',
    createdAt: '2025-10-01'
  },
  {
    id: 'soc-2',
    name: 'Raheja Classique',
    address: 'Link Road, Oshiwara, Andheri West',
    area: 'Andheri West',
    pinCode: '400053',
    secretaryName: 'Alok Kapadia',
    managerName: 'Devendra Joshi',
    contactPhone: '9821008877',
    contactEmail: 'committee@rahejaclassique.org',
    residentsCount: 850,
    partnershipStatus: 'PARTNERED',
    agreementStatus: 'SIGNED',
    assignedAssistantsCount: 6,
    bookingsCount: 142,
    revenueGenerated: 48900,
    notes: 'Frequent senior citizen assistance and hospital OPD accompaniment for Kokilaben Hospital.',
    createdAt: '2025-11-15'
  },
  {
    id: 'soc-3',
    name: 'Oberoi Woods & Splendor',
    address: 'JVLR, Near Majas Depot, Andheri East',
    area: 'JVLR / Andheri East',
    pinCode: '400060',
    secretaryName: 'Meenakshi Iyer',
    managerName: 'Sanjay Salunkhe',
    contactPhone: '9819887766',
    contactEmail: 'splendor.rwa@gmail.com',
    residentsCount: 1600,
    partnershipStatus: 'PROPOSAL_SENT',
    agreementStatus: 'DRAFT',
    assignedAssistantsCount: 4,
    bookingsCount: 68,
    revenueGenerated: 21500,
    notes: 'AGM meeting scheduled next Sunday for society partnership ratification.',
    createdAt: '2026-01-10'
  },
  {
    id: 'soc-4',
    name: 'Maker Towers',
    address: 'Cuffe Parade, Colaba',
    area: 'Cuffe Parade',
    pinCode: '400005',
    secretaryName: 'Cyrus Mistry Estate / Farokh Engineer',
    managerName: 'Percy Bilimoria',
    contactPhone: '9820776655',
    contactEmail: 'manager@makertowers.in',
    residentsCount: 380,
    partnershipStatus: 'PARTNERED',
    agreementStatus: 'SIGNED',
    assignedAssistantsCount: 5,
    bookingsCount: 210,
    revenueGenerated: 78400,
    notes: 'High demand for paperwork, banking, and cultural companion assistance.',
    createdAt: '2025-12-01'
  },
  {
    id: 'soc-5',
    name: 'RNA Continental',
    address: 'Subhash Road, Vile Parle East',
    area: 'Vile Parle',
    pinCode: '400057',
    secretaryName: 'Mahesh Shah',
    managerName: 'Vijay Kadam',
    contactPhone: '9833665544',
    contactEmail: 'rnacontinental@yahoo.co.in',
    residentsCount: 620,
    partnershipStatus: 'NEGOTIATION',
    agreementStatus: 'DRAFT',
    assignedAssistantsCount: 2,
    bookingsCount: 29,
    revenueGenerated: 9200,
    notes: 'Commercial terms being reviewed by legal team.',
    createdAt: '2026-02-05'
  }
];

export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'cp-1',
    code: 'DIBLOFIRST',
    flatDiscount: 100,
    maxDiscount: 100,
    minBookingHours: 2,
    expiryDate: '2026-12-31',
    usageLimit: 10000,
    usedCount: 2450,
    isActive: true,
    description: 'Flat ₹100 OFF on your first booking with Diblo'
  },
  {
    id: 'cp-2',
    code: 'MUMBAI50',
    flatDiscount: 50,
    maxDiscount: 50,
    minBookingHours: 2,
    expiryDate: '2026-12-31',
    usageLimit: 5000,
    usedCount: 1890,
    isActive: true,
    description: '₹50 OFF on any 2+ hours booking in Mumbai'
  },
  {
    id: 'cp-3',
    code: 'SENIORCARE10',
    discountPercentage: 10,
    maxDiscount: 150,
    minBookingHours: 3,
    expiryDate: '2026-12-31',
    usageLimit: 2000,
    usedCount: 640,
    isActive: true,
    description: '10% discount on Senior Citizen and Hospital assistance'
  },
  {
    id: 'cp-4',
    code: 'WEEKEND20',
    discountPercentage: 15,
    maxDiscount: 200,
    minBookingHours: 3,
    expiryDate: '2026-10-31',
    usageLimit: 1000,
    usedCount: 310,
    isActive: true,
    description: '15% OFF on weekend long-duration errand bookings'
  }
];

export const MOCK_REFERRALS: Referral[] = [];

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [];

export const MOCK_ANALYTICS: PlatformAnalytics = {
  totalCustomers: 1240,
  activeBookings: 8,
  todayBookings: 34,
  completedBookings: 1840,
  cancelledBookings: 32,
  activeAssistants: 46,
  totalAssistants: 62,
  totalRevenue: 642850,
  todayRevenue: 14680,
  pendingPayments: 0,
  averageRating: 4.91,
  conversionRate: 68.4,
  repeatCustomerRate: 72.8,
  assistantAcceptanceRate: 96.5,
  servicePopularity: [
    { name: 'Senior Citizen Assistance', count: 540, revenue: 198400 },
    { name: 'Hospital Visit Assistance', count: 480, revenue: 178200 },
    { name: 'Shopping Assistance', count: 390, revenue: 124500 },
    { name: 'Queue Standing Assistance', count: 280, revenue: 98600 },
    { name: 'Government Office Assistance', count: 150, revenue: 43150 }
  ],
  dailyTrends: [
    { date: 'Aug 27', bookings: 24, revenue: 8940 },
    { date: 'Aug 28', bookings: 28, revenue: 10430 },
    { date: 'Aug 29', bookings: 31, revenue: 11920 },
    { date: 'Aug 30', bookings: 38, revenue: 15450 },
    { date: 'Aug 31', bookings: 42, revenue: 17880 },
    { date: 'Sep 01', bookings: 36, revenue: 14900 },
    { date: 'Sep 02', bookings: 34, revenue: 14680 }
  ],
  areaBreakdown: [
    { area: 'Bandra & Khar', bookings: 480, assistants: 14 },
    { area: 'Powai & Vikhroli', bookings: 420, assistants: 12 },
    { area: 'Andheri & Juhu', bookings: 390, assistants: 10 },
    { area: 'Dadar & Prabhadevi', bookings: 310, assistants: 8 },
    { area: 'Colaba & South Mumbai', bookings: 240, assistants: 6 }
  ]
};
