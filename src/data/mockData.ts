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

export const MOCK_ASSISTANTS: AssistantProfile[] = [
  {
    id: 'asst-1',
    userId: 'user-a-1',
    name: 'Rajesh Sharma',
    phone: '9820554433',
    email: 'rajesh.sharma@diblo.in',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    rating: 4.95,
    totalRatings: 142,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Hindi', 'Marathi', 'English'],
    serviceCapabilities: ['senior-citizen-assistance', 'hospital-visit-assistance', 'shopping-assistance', 'personal-errand-assistance'],
    serviceArea: ['Bandra West', 'Bandra East', 'Khar', 'Santacruz', 'BKC'],
    isOnline: true,
    currentLocation: {
      lat: 19.0550,
      lng: 72.8310,
      address: 'Hill Road, Near Mehboob Studio, Bandra West',
      area: 'Bandra West',
      lastUpdated: 'Just now',
      heading: 45
    },
    earnings: {
      today: 1192,
      week: 6705,
      month: 26820,
      total: 82450,
      pendingPayout: 3250
    },
    documents: [
      { id: 'doc-1', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-4589', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2025-11-10' },
      { id: 'doc-2', type: 'POLICE_VERIFICATION', documentNumber: 'PV-MUM-2025-8821', fileUrl: 'https://placehold.co/400x250/png?text=Police+Clearance', verified: true, uploadedAt: '2025-11-12' },
      { id: 'doc-3', type: 'PAN', documentNumber: 'ABCPS1234F', fileUrl: 'https://placehold.co/400x250/png?text=PAN+Card', verified: true, uploadedAt: '2025-11-10' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX5678',
      ifsc: 'HDFC0000123',
      bankName: 'HDFC Bank Bandra West',
      accountHolder: 'Rajesh Sharma'
    },
    emergencyContact: {
      name: 'Kavita Sharma',
      phone: '9820559988',
      relationship: 'Spouse'
    },
    completedTasksCount: 188,
    acceptanceRate: 98,
    activeBookingId: null,
    joinedDate: '2025-10-15'
  },
  {
    id: 'asst-2',
    userId: 'user-a-2',
    name: 'Priya Shinde',
    phone: '9821667788',
    email: 'priya.shinde@diblo.in',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    rating: 4.92,
    totalRatings: 98,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Marathi', 'Hindi', 'English'],
    serviceCapabilities: ['senior-citizen-assistance', 'shopping-assistance', 'document-paperwork-assistance', 'companion-assistance'],
    serviceArea: ['Powai', 'Vikhroli', 'Kanjurmarg', 'Ghatkopar'],
    isOnline: true,
    currentLocation: {
      lat: 19.1220,
      lng: 72.9090,
      address: 'Central Avenue, Hiranandani Gardens, Powai',
      area: 'Powai',
      lastUpdated: '1 min ago',
      heading: 120
    },
    earnings: {
      today: 894,
      week: 5364,
      month: 21456,
      total: 64200,
      pendingPayout: 2100
    },
    documents: [
      { id: 'doc-4', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-9912', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2025-12-01' },
      { id: 'doc-5', type: 'POLICE_VERIFICATION', documentNumber: 'PV-MUM-2025-9943', fileUrl: 'https://placehold.co/400x250/png?text=Police+Clearance', verified: true, uploadedAt: '2025-12-05' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX8912',
      ifsc: 'ICIC0001045',
      bankName: 'ICICI Bank Powai',
      accountHolder: 'Priya Shinde'
    },
    emergencyContact: {
      name: 'Sunil Shinde',
      phone: '9821669900',
      relationship: 'Brother'
    },
    completedTasksCount: 112,
    acceptanceRate: 96,
    activeBookingId: null,
    joinedDate: '2025-11-20'
  },
  {
    id: 'asst-3',
    userId: 'user-a-3',
    name: 'Amitabh Verma',
    phone: '9819778899',
    email: 'amitabh.verma@diblo.in',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    rating: 4.88,
    totalRatings: 76,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Hindi', 'English', 'Gujarati'],
    serviceCapabilities: ['queue-standing-assistance', 'government-office-assistance', 'bank-office-assistance', 'local-task-assistance'],
    serviceArea: ['Andheri West', 'Lokhandwala', 'Juhu', 'Versova'],
    isOnline: true,
    currentLocation: {
      lat: 19.1350,
      lng: 72.8280,
      address: 'Near Infinity Mall, Link Road, Andheri West',
      area: 'Andheri West',
      lastUpdated: '3 mins ago',
      heading: 270
    },
    earnings: {
      today: 596,
      week: 4172,
      month: 18450,
      total: 48900,
      pendingPayout: 1800
    },
    documents: [
      { id: 'doc-6', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-3341', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2025-12-15' },
      { id: 'doc-7', type: 'POLICE_VERIFICATION', documentNumber: 'PV-MUM-2025-1102', fileUrl: 'https://placehold.co/400x250/png?text=Police+Clearance', verified: true, uploadedAt: '2025-12-18' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX3345',
      ifsc: 'SBIN0000456',
      bankName: 'State Bank of India Andheri',
      accountHolder: 'Amitabh Verma'
    },
    emergencyContact: {
      name: 'Rekha Verma',
      phone: '9819770011',
      relationship: 'Mother'
    },
    completedTasksCount: 84,
    acceptanceRate: 94,
    activeBookingId: null,
    joinedDate: '2025-12-10'
  },
  {
    id: 'asst-4',
    userId: 'user-a-4',
    name: 'Suresh Patil',
    phone: '9820889900',
    email: 'suresh.patil@diblo.in',
    photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    rating: 4.90,
    totalRatings: 110,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Marathi', 'Hindi', 'English'],
    serviceCapabilities: ['hospital-visit-assistance', 'medicine-pharmacy-assistance', 'senior-citizen-assistance'],
    serviceArea: ['Dadar', 'Parel', 'Lower Parel', 'Prabhadevi', 'Worli'],
    isOnline: true,
    currentLocation: {
      lat: 19.0180,
      lng: 72.8430,
      address: 'Near Shivaji Park, Dadar West',
      area: 'Dadar',
      lastUpdated: '2 mins ago',
      heading: 90
    },
    earnings: {
      today: 1490,
      week: 7450,
      month: 29800,
      total: 91200,
      pendingPayout: 4200
    },
    documents: [
      { id: 'doc-8', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-6677', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2025-10-01' },
      { id: 'doc-9', type: 'POLICE_VERIFICATION', documentNumber: 'PV-MUM-2025-4421', fileUrl: 'https://placehold.co/400x250/png?text=Police+Clearance', verified: true, uploadedAt: '2025-10-05' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX7789',
      ifsc: 'AXIS0000890',
      bankName: 'Axis Bank Dadar',
      accountHolder: 'Suresh Patil'
    },
    emergencyContact: {
      name: 'Nalini Patil',
      phone: '9820881122',
      relationship: 'Wife'
    },
    completedTasksCount: 165,
    acceptanceRate: 99,
    activeBookingId: null,
    joinedDate: '2025-09-20'
  },
  {
    id: 'asst-5',
    userId: 'user-a-5',
    name: 'Anjali Nair',
    phone: '9833990011',
    email: 'anjali.nair@diblo.in',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    rating: 4.97,
    totalRatings: 88,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['English', 'Hindi', 'Malayalam'],
    serviceCapabilities: ['senior-citizen-assistance', 'companion-assistance', 'appointment-assistance', 'document-paperwork-assistance'],
    serviceArea: ['Colaba', 'Cuffe Parade', 'Nariman Point', 'Fort', 'Marine Drive'],
    isOnline: true,
    currentLocation: {
      lat: 18.9220,
      lng: 72.8340,
      address: 'Near Regal Cinema, Colaba Causeway',
      area: 'Colaba',
      lastUpdated: 'Just now',
      heading: 180
    },
    earnings: {
      today: 1043,
      week: 6258,
      month: 25032,
      total: 75200,
      pendingPayout: 2900
    },
    documents: [
      { id: 'doc-10', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-1144', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2025-11-05' },
      { id: 'doc-11', type: 'POLICE_VERIFICATION', documentNumber: 'PV-MUM-2025-6671', fileUrl: 'https://placehold.co/400x250/png?text=Police+Clearance', verified: true, uploadedAt: '2025-11-08' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX1145',
      ifsc: 'KKBK0000451',
      bankName: 'Kotak Mahindra Bank Fort',
      accountHolder: 'Anjali Nair'
    },
    emergencyContact: {
      name: 'Ravi Nair',
      phone: '9833994455',
      relationship: 'Father'
    },
    completedTasksCount: 105,
    acceptanceRate: 97,
    activeBookingId: null,
    joinedDate: '2025-11-01'
  },
  {
    id: 'asst-6',
    userId: 'user-a-6',
    name: 'Karan Jaiswal',
    phone: '9820223344',
    email: 'karan.jaiswal@diblo.in',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    rating: 4.82,
    totalRatings: 45,
    verificationStatus: 'VERIFIED',
    policeVerified: true,
    languages: ['Hindi', 'English'],
    serviceCapabilities: ['shopping-assistance', 'personal-errand-assistance', 'local-task-assistance'],
    serviceArea: ['Thane West', 'Mulund', 'Bhandup'],
    isOnline: false,
    currentLocation: {
      lat: 19.2183,
      lng: 72.9781,
      address: 'Gokhale Road, Naupada, Thane West',
      area: 'Thane',
      lastUpdated: '1 hour ago'
    },
    earnings: {
      today: 0,
      week: 3576,
      month: 14304,
      total: 34500,
      pendingPayout: 1200
    },
    documents: [
      { id: 'doc-12', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-8822', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: true, uploadedAt: '2026-01-05' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX8823',
      ifsc: 'HDFC0000555',
      bankName: 'HDFC Bank Thane',
      accountHolder: 'Karan Jaiswal'
    },
    emergencyContact: {
      name: 'Pooja Jaiswal',
      phone: '9820229988',
      relationship: 'Sister'
    },
    completedTasksCount: 52,
    acceptanceRate: 91,
    activeBookingId: null,
    joinedDate: '2026-01-02'
  },
  {
    id: 'asst-7',
    userId: 'user-a-7',
    name: 'Nitin Kamble',
    phone: '9821334455',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    rating: 4.75,
    totalRatings: 18,
    verificationStatus: 'PENDING',
    policeVerified: false,
    languages: ['Marathi', 'Hindi'],
    serviceCapabilities: ['queue-standing-assistance', 'shopping-assistance'],
    serviceArea: ['Borivali West', 'Kandivali', 'Malad'],
    isOnline: false,
    currentLocation: {
      lat: 19.2307,
      lng: 72.8567,
      address: 'SV Road, Borivali West',
      area: 'Borivali',
      lastUpdated: '3 hours ago'
    },
    earnings: { today: 0, week: 0, month: 0, total: 0, pendingPayout: 0 },
    documents: [
      { id: 'doc-13', type: 'AADHAAR', documentNumber: 'XXXX-XXXX-9901', fileUrl: 'https://placehold.co/400x250/png?text=Aadhaar+Card', verified: false, uploadedAt: '2026-02-28' },
      { id: 'doc-14', type: 'PAN', documentNumber: 'XYZPK8899M', fileUrl: 'https://placehold.co/400x250/png?text=PAN+Card', verified: false, uploadedAt: '2026-02-28' }
    ],
    bankDetails: {
      accountNumber: 'XXXXXX9902',
      ifsc: 'BARB0BORIV',
      bankName: 'Bank of Baroda Borivali',
      accountHolder: 'Nitin Kamble'
    },
    emergencyContact: {
      name: 'Usha Kamble',
      phone: '9821338877',
      relationship: 'Mother'
    },
    completedTasksCount: 0,
    acceptanceRate: 100,
    activeBookingId: null,
    joinedDate: '2026-02-28'
  }
];

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
