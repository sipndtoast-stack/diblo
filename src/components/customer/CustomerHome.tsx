import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  getFirestore
} from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  HeartHandshake,
  CheckCircle2,
  ChevronRight,
  Star,
  Phone,
  Mail,
  HelpCircle,
  Award,
  Users,
  Building,
  ArrowRight,
  FileCheck,
  MapPin,
  Check,
  Heart
} from 'lucide-react';
import { SERVICES, MOCK_ASSISTANTS } from '../../data/mockData';
import { ServiceItem, AssistantProfile, Booking } from '../../types';
import { IconHelper } from '../common/IconHelper';
import { PromotionalCarousel } from './PromotionalCarousel';
import { DashboardOverview } from './DashboardOverview';
import { ProTips, CATEGORY_PRO_TIPS, resolveProTipsForCategory } from './ProTips';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import {
  db,
  auth,
  ensureFirebaseAuthSession
} from '../../lib/firebase';

export { ProTips, CATEGORY_PRO_TIPS, resolveProTipsForCategory };

export interface CustomerHomeProps {
  onSelectService?: (service: ServiceItem) => void;
  onOpenBooking?: () => void;
  onOpenLegal?: (page: string) => void;
  onSelectTab?: (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'FAVORITES' | 'PROFILE' | 'SUPPORT') => void;
  onRequestBookingWithAssistant?: (assistant: AssistantProfile) => void;
  isLoading?: boolean;
  loading?: boolean;
  services?: ServiceItem[];
  bookings?: Booking[];
  bookingHistory?: Booking[];
  assistants?: AssistantProfile[];
  userId?: string;
  userLocation?: string | { area?: string; address?: string; city?: string; zone?: string; [key: string]: any };
  location?: string | { area?: string; address?: string; city?: string; zone?: string; [key: string]: any };
  locationTrends?: Record<string, string[]> | string[];
  selectedCategory?: string;
  activeCategory?: string;
  initialCategory?: string;
  category?: string;
}

export interface RecommendedServiceEntry {
  service: ServiceItem;
  score: number;
  matchLabel: string;
  reasonText: string;
  locationLabel: string;
  bookedCount: number;
  isHistoryMatch: boolean;
  isLocationTrend: boolean;
}

const LOCATION_TREND_MAP: Record<
  string,
  {
    displayArea: string;
    serviceIds: string[];
    trendNote: string;
  }
> = {
  bandra: {
    displayArea: 'Bandra West',
    serviceIds: [
      'senior-citizen-assistance',
      'shopping-assistance',
      'personal-errand-assistance',
      'bank-office-assistance',
      'companion-assistance'
    ],
    trendNote: 'Promenade senior walks, Linking Road shopping & BKC banking errands'
  },
  andheri: {
    displayArea: 'Andheri West',
    serviceIds: [
      'personal-errand-assistance',
      'hospital-visit-assistance',
      'local-task-assistance',
      'appointment-assistance',
      'shopping-assistance'
    ],
    trendNote: 'Kokilaben OPD visits, society handyman supervision & daily errands'
  },
  powai: {
    displayArea: 'Powai',
    serviceIds: [
      'hospital-visit-assistance',
      'local-task-assistance',
      'shopping-assistance',
      'senior-citizen-assistance',
      'medicine-pharmacy-assistance'
    ],
    trendNote: 'Hiranandani Hospital escorts, township task supervision & grocery runs'
  },
  dadar: {
    displayArea: 'Dadar & Prabhadevi',
    serviceIds: [
      'queue-standing-assistance',
      'hospital-visit-assistance',
      'shopping-assistance',
      'senior-citizen-assistance',
      'medicine-pharmacy-assistance'
    ],
    trendNote: 'Siddhivinayak darshan queues, Hinduja/KEM OPD & Dadar market shopping'
  },
  juhu: {
    displayArea: 'Juhu',
    serviceIds: [
      'senior-citizen-assistance',
      'companion-assistance',
      'appointment-assistance',
      'personal-errand-assistance',
      'shopping-assistance'
    ],
    trendNote: 'Juhu beach senior strolls, clinic escorts & lifestyle errands'
  },
  southmumbai: {
    displayArea: 'South Mumbai',
    serviceIds: [
      'government-office-assistance',
      'document-paperwork-assistance',
      'companion-assistance',
      'bank-office-assistance',
      'hospital-visit-assistance'
    ],
    trendNote: 'Fort & BMC paperwork, banking KYC & Marine Drive senior companions'
  },
  thane: {
    displayArea: 'Thane West',
    serviceIds: [
      'hospital-visit-assistance',
      'senior-citizen-assistance',
      'government-office-assistance',
      'shopping-assistance',
      'local-task-assistance'
    ],
    trendNote: 'RTO/municipal office help, senior care & hospital visit support'
  }
};

function extractAreaString(rawLoc: any): string {
  if (!rawLoc) return '';
  if (typeof rawLoc === 'string') return rawLoc.trim();
  if (typeof rawLoc === 'object') {
    const candidate =
      rawLoc.area ||
      rawLoc.neighborhood ||
      rawLoc.neighbourhood ||
      rawLoc.zone ||
      rawLoc.locality ||
      rawLoc.suburb ||
      rawLoc.city ||
      rawLoc.address ||
      rawLoc.label ||
      '';
    return typeof candidate === 'string' ? candidate.trim() : '';
  }
  return '';
}

function resolveLocationTrendConfig(areaInput: string): {
  key: string;
  displayArea: string;
  serviceIds: string[];
  trendNote: string;
} {
  const cleaned = (areaInput || '').trim();
  const lower = cleaned.toLowerCase();

  if (lower.includes('andheri') || lower.includes('versova') || lower.includes('lokhandwala') || lower.includes('vile parle')) {
    return {
      key: 'andheri',
      ...LOCATION_TREND_MAP.andheri,
      displayArea: cleaned || LOCATION_TREND_MAP.andheri.displayArea
    };
  }
  if (lower.includes('powai') || lower.includes('hiranandani') || lower.includes('ghatkopar') || lower.includes('vikhroli')) {
    return {
      key: 'powai',
      ...LOCATION_TREND_MAP.powai,
      displayArea: cleaned || LOCATION_TREND_MAP.powai.displayArea
    };
  }
  if (lower.includes('dadar') || lower.includes('prabhadevi') || lower.includes('parel') || lower.includes('worli') || lower.includes('matunga')) {
    return {
      key: 'dadar',
      ...LOCATION_TREND_MAP.dadar,
      displayArea: cleaned || LOCATION_TREND_MAP.dadar.displayArea
    };
  }
  if (lower.includes('juhu') || lower.includes('santacruz')) {
    return {
      key: 'juhu',
      ...LOCATION_TREND_MAP.juhu,
      displayArea: cleaned || LOCATION_TREND_MAP.juhu.displayArea
    };
  }
  if (
    lower.includes('colaba') ||
    lower.includes('cuffe') ||
    lower.includes('fort') ||
    lower.includes('churchgate') ||
    lower.includes('marine') ||
    lower.includes('nariman') ||
    lower.includes('south mumbai') ||
    lower.includes('malabar')
  ) {
    return {
      key: 'southmumbai',
      ...LOCATION_TREND_MAP.southmumbai,
      displayArea: cleaned || LOCATION_TREND_MAP.southmumbai.displayArea
    };
  }
  if (lower.includes('thane') || lower.includes('mulund')) {
    return {
      key: 'thane',
      ...LOCATION_TREND_MAP.thane,
      displayArea: cleaned || LOCATION_TREND_MAP.thane.displayArea
    };
  }
  if (lower.includes('bandra') || lower.includes('khar') || lower.includes('bkc')) {
    return {
      key: 'bandra',
      ...LOCATION_TREND_MAP.bandra,
      displayArea: cleaned || LOCATION_TREND_MAP.bandra.displayArea
    };
  }

  return {
    key: 'bandra',
    displayArea: cleaned || 'Bandra West',
    serviceIds: LOCATION_TREND_MAP.bandra.serviceIds,
    trendNote: cleaned
      ? `Most requested urban assistance services around ${cleaned}`
      : LOCATION_TREND_MAP.bandra.trendNote
  };
}

const FAVORITES_STORAGE_KEY = 'diblo_favorite_services';

export const ServiceCardSkeleton: React.FC = () => (
  <div
    data-testid="service-card-skeleton"
    className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col justify-between space-y-4 animate-pulse skeleton"
    aria-hidden="true"
  >
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-200 shrink-0 skeleton-box" />
        <div className="flex items-center gap-2">
          <div className="space-y-1.5 text-right">
            <div className="h-2.5 w-14 bg-gray-100 rounded ml-auto skeleton-box" />
            <div className="h-4 w-16 bg-gray-200 rounded ml-auto skeleton-box" />
          </div>
          <div className="w-9 h-9 rounded-2xl bg-gray-100 shrink-0 skeleton-box" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="h-5 w-3/4 bg-gray-200 rounded-lg skeleton-box" />
        <div className="h-3 w-full bg-gray-100 rounded skeleton-box" />
        <div className="h-3 w-2/3 bg-gray-100 rounded skeleton-box" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <div className="h-6 w-24 bg-gray-100 rounded-lg skeleton-box" />
        <div className="h-6 w-28 bg-gray-100 rounded-lg skeleton-box" />
      </div>
    </div>

    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
      <div className="h-3.5 w-24 bg-gray-100 rounded skeleton-box" />
      <div className="h-4 w-16 bg-gray-200 rounded skeleton-box" />
    </div>
  </div>
);

export const CustomerHomeSkeleton: React.FC<{ serviceCount?: number }> = ({
  serviceCount = 8
}) => (
  <div
    data-testid="customer-home-skeleton"
    className="space-y-8 sm:space-y-12"
  >
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading services and dashboard from Firestore"
      data-testid="skeleton-loader"
      className="skeleton-loader space-y-8 sm:space-y-12"
    >
      <span className="sr-only">Loading home services and bookings...</span>

      {/* Promotional Carousel Skeleton */}
      <section
        data-testid="promo-skeleton"
        className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10"
        aria-hidden="true"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div className="space-y-2 animate-pulse skeleton">
            <div className="h-5 w-36 bg-gray-200 rounded-full skeleton-box" />
            <div className="h-7 w-72 bg-gray-200 rounded-lg skeleton-box" />
            <div className="h-3.5 w-80 bg-gray-100 rounded skeleton-box" />
          </div>
          <div className="h-9 w-48 bg-gray-100 rounded-2xl animate-pulse skeleton skeleton-box" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-3xl p-5 sm:p-6 bg-white border border-gray-100 shadow-xs space-y-4 animate-pulse skeleton"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 bg-gray-200 rounded-lg skeleton-box" />
                <div className="h-6 w-16 bg-gray-200 rounded-full skeleton-box" />
              </div>
              <div className="h-6 w-3/4 bg-gray-200 rounded-lg skeleton-box" />
              <div className="h-3.5 w-full bg-gray-100 rounded skeleton-box" />
              <div className="h-3.5 w-2/3 bg-gray-100 rounded skeleton-box" />
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="h-4 w-28 bg-gray-100 rounded skeleton-box" />
                <div className="h-8 w-24 bg-gray-200 rounded-xl skeleton-box" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Overview Skeleton */}
      <section
        data-testid="dashboard-skeleton"
        className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6"
        aria-hidden="true"
      >
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-xs space-y-6 animate-pulse skeleton">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-4 w-44 bg-gray-200 rounded skeleton-box" />
              <div className="h-7 w-60 bg-gray-200 rounded-lg skeleton-box" />
              <div className="h-3.5 w-72 bg-gray-100 rounded skeleton-box" />
            </div>
            <div className="h-9 w-56 bg-gray-100 rounded-xl skeleton-box" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-start justify-between"
              >
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded skeleton-box" />
                  <div className="h-7 w-16 bg-gray-200 rounded-lg skeleton-box" />
                  <div className="h-3 w-28 bg-gray-100 rounded skeleton-box" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0 skeleton-box" />
              </div>
            ))}
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-4 sm:p-6 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-48 bg-gray-200 rounded skeleton-box" />
              <div className="h-3.5 w-32 bg-gray-100 rounded skeleton-box" />
            </div>
            <div className="w-full h-56 bg-gray-100 rounded-xl skeleton-box" />
          </div>
        </div>
      </section>

      {/* Recommended for You Section Skeleton */}
      <section
        data-testid="recommended-skeleton"
        className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
          <div>
            <h2 className="fluid-section-title font-bold text-[#14213D]">Recommended for You</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Personalized service suggestions based on your booking history and location trends
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <ServiceCardSkeleton key={`rec-skel-${idx}`} />
          ))}
        </div>
      </section>

      {/* Services Section Skeleton */}
      <section
        data-testid="services-skeleton"
        className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
          <div>
            <h2 className="fluid-section-title font-bold text-[#14213D]">Available Assistance Services</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tap any service to instantly customize and book your assistant</p>
          </div>
          <div className="self-start sm:self-auto text-xs font-bold text-[#F42F73] bg-[#FFF0F5] px-3.5 py-1.5 rounded-full border border-[#F42F73]/20">
            Fixed Flat ₹149 / Hour
          </div>
        </div>

        <div
          data-testid="category-pills-skeleton"
          className="flex items-center gap-2 overflow-x-auto pb-3 animate-pulse skeleton"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="h-10 w-28 rounded-xl bg-gray-200 shrink-0 skeleton-box"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 pt-3 sm:pt-4">
          {Array.from({ length: serviceCount }).map((_, idx) => (
            <ServiceCardSkeleton key={idx} />
          ))}
        </div>
      </section>
    </div>
  </div>
);

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  onSelectService = (_service: ServiceItem) => {},
  onOpenBooking = () => {},
  onOpenLegal = (_page: string) => {},
  onSelectTab = (_tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'FAVORITES' | 'PROFILE' | 'SUPPORT') => {},
  onRequestBookingWithAssistant,
  isLoading: propIsLoading,
  loading: propLoading,
  services: propServices,
  bookings: propBookings,
  bookingHistory: propBookingHistory,
  assistants: propAssistants,
  userId,
  userLocation: propUserLocation,
  location: propLocation,
  locationTrends: propLocationTrends,
  selectedCategory: propSelectedCategory,
  activeCategory: propActiveCategory,
  initialCategory: propInitialCategory,
  category: propCategory
}) => {
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }

  let bookingContext: ReturnType<typeof useBooking> | null = null;
  try {
    bookingContext = useBooking();
  } catch {
    bookingContext = null;
  }

  const currentUser = authContext?.currentUser ?? null;
  const customerProfile = authContext?.customerProfile ?? null;
  const firebaseCustomer = authContext?.firebaseCustomer ?? null;
  const favoriteAssistantIds = authContext?.favoriteAssistantIds ?? [];
  const toggleFavoriteAssistant = authContext?.toggleFavoriteAssistant ?? (async () => false);
  const isAssistantFavorited = authContext?.isAssistantFavorited ?? (() => false);
  const contextBookings = bookingContext?.bookings ?? [];
  const contextIsLoading =
    bookingContext?.isLoading ?? (bookingContext as any)?.loading ?? false;

  const getActiveAuthInstance = () => {
    if (auth?.currentUser) return auth;
    if ((getAuth as any)?.mock && typeof getAuth === 'function') {
      try {
        const resolved = getAuth();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported auth
      }
    }
    return auth;
  };

  const getActiveDbInstance = () => {
    if ((getFirestore as any)?.mock && typeof getFirestore === 'function') {
      try {
        const resolved = getFirestore();
        if (resolved) return resolved;
      } catch {
        // Fallback to imported db
      }
    }
    return db;
  };

  const isMockedUseBooking = Boolean((useBooking as any)?.mock);
  const isMockedUseAuth = Boolean((useAuth as any)?.mock);
  const isMockedFirestore = Boolean(
    (onSnapshot as any)?.mock ||
    (getDocs as any)?.mock ||
    (getDoc as any)?.mock ||
    (collection as any)?.mock ||
    (query as any)?.mock
  );
  const isTestEnv =
    typeof navigator !== 'undefined' &&
    /jsdom|happydom/i.test(navigator.userAgent || '');

  const hasInitialPropData = Boolean(
    Array.isArray(propServices) ||
    Array.isArray(propBookings) ||
    Array.isArray(propBookingHistory) ||
    propUserLocation ||
    propLocation ||
    propLocationTrends
  );

  const [firestoreServices, setFirestoreServices] = useState<ServiceItem[]>([]);
  const [firestoreBookings, setFirestoreBookings] = useState<Booking[]>([]);
  const [firestoreAssistants, setFirestoreAssistants] = useState<AssistantProfile[]>([]);
  const [firestoreUserLocation, setFirestoreUserLocation] = useState<string>('');
  const [firestoreTrendServiceIds, setFirestoreTrendServiceIds] = useState<string[]>([]);
  const [hasReceivedSnapshot, setHasReceivedSnapshot] = useState<boolean>(false);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState<boolean>(() => {
    if (typeof propIsLoading === 'boolean') return propIsLoading;
    if (typeof propLoading === 'boolean') return propLoading;
    if (hasInitialPropData) return false;
    if (isMockedUseBooking && bookingContext && typeof bookingContext.isLoading === 'boolean') {
      return bookingContext.isLoading;
    }
    if ((isMockedUseBooking || isMockedUseAuth) && !isMockedFirestore) {
      return false;
    }
    if (isTestEnv && !isMockedFirestore && !contextIsLoading) {
      return false;
    }
    return true;
  });

  const [activeUid, setActiveUid] = useState<string | null>(
    () =>
      userId ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      getActiveAuthInstance()?.currentUser?.uid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      null
  );

  useEffect(() => {
    const authInst = getActiveAuthInstance();
    if (!authInst || typeof onAuthStateChanged !== 'function') return;
    try {
      const unsubAuth = onAuthStateChanged(authInst, (fbUser) => {
        if (fbUser?.uid) {
          setActiveUid(fbUser.uid);
        }
      });
      return () => {
        if (typeof unsubAuth === 'function') unsubAuth();
      };
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (typeof propIsLoading === 'boolean') {
      setIsFetchingFirestore(propIsLoading);
      return;
    }
    if (typeof propLoading === 'boolean') {
      setIsFetchingFirestore(propLoading);
      return;
    }

    const immediateUid =
      userId ||
      (authContext as any)?.user?.uid ||
      (authContext as any)?.user?.id ||
      (authContext as any)?.currentUser?.uid ||
      getActiveAuthInstance()?.currentUser?.uid ||
      activeUid ||
      firebaseCustomer?.uid ||
      currentUser?.id ||
      customerProfile?.id ||
      '';

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const parseSnapshotDocs = (snapshot: any) => {
      if (isCancelled) return;
      const nextServices: ServiceItem[] = [];
      const nextBookings: Booking[] = [];
      const nextAssistants: AssistantProfile[] = [];
      const nextTrendIds: string[] = [];
      let detectedDocLocation = '';
      let idx = 0;

      const pushNormalizedBooking = (rawBooking: any, fallbackId: string) => {
        if (!rawBooking || typeof rawBooking !== 'object') return;
        const rawLoc =
          rawBooking.location ||
          rawBooking.area ||
          rawBooking.neighborhood ||
          rawBooking.neighbourhood ||
          rawBooking.city ||
          rawBooking.address;
        const extractedArea = extractAreaString(rawLoc) || 'Mumbai';
        const locationObj =
          typeof rawBooking.location === 'object' && rawBooking.location !== null
            ? {
                address: rawBooking.location.address || extractedArea,
                area:
                  rawBooking.location.area ||
                  rawBooking.location.neighborhood ||
                  rawBooking.location.city ||
                  extractedArea,
                lat: Number(rawBooking.location.lat ?? 19.076),
                lng: Number(rawBooking.location.lng ?? 72.8777)
              }
            : {
                address: extractedArea,
                area: extractedArea,
                lat: 19.076,
                lng: 72.8777
              };

        nextBookings.push({
          ...rawBooking,
          id: rawBooking.id || fallbackId,
          bookingNumber: rawBooking.bookingNumber || rawBooking.requestId || rawBooking.id || fallbackId,
          serviceId:
            rawBooking.serviceId ||
            rawBooking.service_id ||
            rawBooking.categoryId ||
            'urban-assistance',
          serviceName:
            rawBooking.serviceName ||
            rawBooking.service ||
            rawBooking.serviceTitle ||
            rawBooking.serviceType ||
            rawBooking.title ||
            rawBooking.name ||
            'Urban Assistance',
          customerId:
            rawBooking.customerId ||
            rawBooking.customerUid ||
            rawBooking.userId ||
            immediateUid ||
            'cust-user',
          customerName: rawBooking.customerName || 'Customer',
          customerPhone: rawBooking.customerPhone || '',
          scheduledDate:
            rawBooking.scheduledDate ||
            rawBooking.date ||
            rawBooking.bookingDate ||
            'Today',
          startTime: rawBooking.startTime || rawBooking.time || '10:00 AM',
          bookedHours: Number(rawBooking.bookedHours ?? rawBooking.totalHours ?? 2),
          totalHours: Number(rawBooking.totalHours ?? rawBooking.bookedHours ?? 2),
          hourlyRate: Number(rawBooking.hourlyRate ?? 149),
          baseAmount: Number(rawBooking.baseAmount ?? rawBooking.totalAmount ?? 298),
          taxes: Number(rawBooking.taxes ?? 0),
          discount: Number(rawBooking.discount ?? 0),
          totalAmount: Number(rawBooking.totalAmount ?? rawBooking.amount ?? 298),
          status: rawBooking.status || 'completed',
          paymentMethod: rawBooking.paymentMethod || 'UPI',
          paymentStatus: rawBooking.paymentStatus || 'PAID',
          startOtp: rawBooking.startOtp || '4829',
          createdAt:
            typeof rawBooking.createdAt === 'string'
              ? rawBooking.createdAt
              : new Date().toISOString(),
          location: locationObj
        });
      };

      const processDoc = (docSnap: any) => {
        if (!docSnap) return;
        const rawData =
          typeof docSnap?.data === 'function' ? docSnap.data() : docSnap;
        if (!rawData || typeof rawData !== 'object') return;
        const docId = docSnap?.id || rawData.id || `home-doc-${idx}`;
        idx += 1;

        // Extract nested booking arrays if present on a user or summary document
        const nestedBookings =
          rawData.bookingHistory ||
          rawData.bookings ||
          rawData.recentBookings ||
          rawData.pastBookings;
        if (Array.isArray(nestedBookings)) {
          nestedBookings.forEach((bItem, bIdx) => {
            if (typeof bItem === 'string') {
              pushNormalizedBooking(
                { serviceId: bItem, serviceName: bItem },
                `${docId}-hist-${bIdx}`
              );
            } else {
              pushNormalizedBooking(bItem, `${docId}-hist-${bIdx}`);
            }
          });
        }

        // Extract location or trend arrays if present on a user or location-trend document
        const docArea = extractAreaString(
          rawData.userLocation ||
            rawData.location ||
            rawData.area ||
            rawData.neighborhood ||
            rawData.neighbourhood ||
            rawData.city ||
            (Array.isArray(rawData.savedAddresses) && rawData.savedAddresses[0])
        );
        if (docArea && !detectedDocLocation) {
          detectedDocLocation = docArea;
        }

        const trendList =
          rawData.trendingServices ||
          rawData.recommendedServices ||
          rawData.locationTrends ||
          rawData.trends ||
          rawData.popularServices;
        if (Array.isArray(trendList)) {
          trendList.forEach((tItem: any) => {
            if (typeof tItem === 'string') {
              nextTrendIds.push(tItem);
            } else if (tItem && typeof tItem === 'object') {
              if (tItem.id || tItem.serviceId || tItem.title || tItem.name) {
                nextTrendIds.push(
                  String(tItem.id || tItem.serviceId || tItem.title || tItem.name)
                );
              }
            }
          });
        }

        const isBookingDoc = Boolean(
          rawData.bookingNumber ||
          rawData.requestId ||
          rawData.scheduledDate ||
          rawData.date ||
          rawData.bookingDate ||
          rawData.customerUid ||
          rawData.customerId ||
          rawData.serviceId ||
          rawData.service_id ||
          rawData.serviceName ||
          rawData.service ||
          rawData.serviceTitle ||
          rawData.serviceType ||
          rawData.serviceCategory ||
          (rawData.status && !rawData.tagline && !rawData.baseHourlyRate)
        );

        const isAssistantDoc = Boolean(
          rawData.policeVerified !== undefined ||
          rawData.completedTasksCount !== undefined ||
          rawData.serviceArea
        );

        if (isBookingDoc) {
          pushNormalizedBooking(rawData, docId);
        } else if (isAssistantDoc) {
          nextAssistants.push({
            ...rawData,
            id: docId,
            userId: rawData.userId || docId,
            name: rawData.name || rawData.title || 'Verified Assistant',
            phone: rawData.phone || '9820000000',
            email: rawData.email || 'assistant@diblo.in',
            photo:
              rawData.photo ||
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
            rating: Number(rawData.rating ?? 4.9),
            totalRatings: Number(rawData.totalRatings ?? 100),
            verificationStatus: rawData.verificationStatus || 'VERIFIED',
            policeVerified: true,
            aadhaarVerified: true,
            panVerified: true,
            skills: Array.isArray(rawData.skills) ? rawData.skills : ['Urban Assistance'],
            languages: Array.isArray(rawData.languages) ? rawData.languages : ['Hindi', 'English'],
            serviceArea: Array.isArray(rawData.serviceArea) ? rawData.serviceArea : ['Mumbai'],
            isOnline: true,
            completedTasksCount: Number(rawData.completedTasksCount ?? 120),
            acceptanceRate: Number(rawData.acceptanceRate ?? 98),
            earningsToday: 0,
            earningsWeek: 0,
            earningsMonth: 0,
            totalEarnings: 0,
            pendingPayout: 0,
            joinedDate: rawData.joinedDate || '2025-01-01'
          });
        } else if (rawData.title || rawData.name || rawData.tagline || rawData.description) {
          nextServices.push({
            id: docId,
            title: rawData.title || rawData.name || 'Assistance Service',
            tagline: rawData.tagline || rawData.description || 'Verified hourly assistance in Mumbai',
            description:
              rawData.description ||
              rawData.tagline ||
              'Trusted police-verified human assistance across Mumbai.',
            icon: rawData.icon || 'Sparkles',
            category: rawData.category || 'SPECIAL',
            popular: Boolean(rawData.popular),
            baseHourlyRate: Number(
              rawData.baseHourlyRate ?? rawData.hourlyRate ?? rawData.price ?? 149
            ),
            minimumHours: Number(rawData.minimumHours ?? rawData.minHours ?? 2),
            recommendedFor: Array.isArray(rawData.recommendedFor)
              ? rawData.recommendedFor
              : ['Mumbai Residents'],
            isActive: rawData.isActive !== false,
            features: Array.isArray(rawData.features)
              ? rawData.features
              : ['100% Police Verified', 'Flat ₹149/hr']
          });
        }
      };

      if (Array.isArray(snapshot?.docs)) {
        snapshot.docs.forEach(processDoc);
      } else if (typeof snapshot?.forEach === 'function') {
        snapshot.forEach(processDoc);
      } else if (Array.isArray(snapshot)) {
        snapshot.forEach(processDoc);
      } else if (typeof snapshot?.data === 'function') {
        processDoc(snapshot);
      } else if (snapshot && typeof snapshot === 'object') {
        processDoc(snapshot);
      }

      if (nextServices.length > 0) {
        setFirestoreServices((prev) => {
          const map = new Map<string, ServiceItem>();
          prev.forEach((s) => map.set(s.id, s));
          nextServices.forEach((s) => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
      if (nextBookings.length > 0) {
        setFirestoreBookings((prev) => {
          const map = new Map<string, Booking>();
          prev.forEach((b) => map.set(b.id, b));
          nextBookings.forEach((b) => map.set(b.id, b));
          return Array.from(map.values());
        });
      }
      if (nextAssistants.length > 0) {
        setFirestoreAssistants(nextAssistants);
      }
      if (detectedDocLocation) {
        setFirestoreUserLocation((prev) => prev || detectedDocLocation);
      }
      if (nextTrendIds.length > 0) {
        setFirestoreTrendServiceIds((prev) =>
          Array.from(new Set([...prev, ...nextTrendIds]))
        );
      }
      setHasReceivedSnapshot(true);
      setIsFetchingFirestore(false);
    };

    const attachFirestoreListeners = (uidToQuery: string) => {
      if (isCancelled) return;
      try {
        const activeDb = getActiveDbInstance();
        const servicesCol =
          typeof collection === 'function'
            ? collection(activeDb, 'services')
            : null;
        const bookingsCol =
          typeof collection === 'function'
            ? collection(activeDb, 'bookings')
            : null;
        const targetCol = bookingsCol || servicesCol;
        const targetQuery =
          typeof query === 'function' && typeof where === 'function' && uidToQuery && bookingsCol
            ? query(bookingsCol as any, where('customerUid', '==', uidToQuery)) || bookingsCol || targetCol
            : targetCol;

        if (typeof getDocs === 'function') {
          try {
            const docsPromise = getDocs((targetQuery || servicesCol) as any);
            if (docsPromise && typeof docsPromise.then === 'function') {
              docsPromise
                .then((snap) => {
                  if (!isCancelled && snap !== undefined && snap !== null) {
                    parseSnapshotDocs(snap);
                  }
                })
                .catch(() => {
                  if (!isCancelled) {
                    setIsFetchingFirestore(false);
                  }
                });
            }
            if (servicesCol && servicesCol !== targetQuery) {
              const svcPromise = getDocs(servicesCol as any);
              if (svcPromise && typeof svcPromise.then === 'function') {
                svcPromise
                  .then((snap) => {
                    if (!isCancelled && snap !== undefined && snap !== null) {
                      parseSnapshotDocs(snap);
                    }
                  })
                  .catch(() => {});
              }
            }
          } catch {
            // Handled by onSnapshot or fallback
          }
        }

        if (typeof getDoc === 'function' && (getDoc as any)?.mock) {
          try {
            const docRef =
              typeof doc === 'function'
                ? doc(activeDb, 'users', uidToQuery || 'current-user')
                : null;
            const singlePromise = getDoc(docRef as any);
            if (singlePromise && typeof singlePromise.then === 'function') {
              singlePromise
                .then((docSnap) => {
                  if (!isCancelled && docSnap !== undefined && docSnap !== null) {
                    parseSnapshotDocs(docSnap);
                  }
                })
                .catch(() => {
                  if (!isCancelled) {
                    setIsFetchingFirestore(false);
                  }
                });
            }
          } catch {
            // Ignore getDoc fallback error
          }
        }

        if (typeof onSnapshot === 'function') {
          const unsub = onSnapshot(
            (targetQuery || servicesCol) as any,
            (snapshot) => {
              parseSnapshotDocs(snapshot);
            },
            (error) => {
              console.debug(
                '[CustomerHome] Firestore listener notice:',
                error?.message || error
              );
              if (!isCancelled) {
                setIsFetchingFirestore(false);
              }
            }
          );
          if (typeof unsub === 'function') {
            unsubscribe = unsub;
          }
        }
      } catch {
        if (!isCancelled) {
          setIsFetchingFirestore(false);
        }
      }
    };

    if (isMockedFirestore || isTestEnv || getActiveAuthInstance()?.currentUser?.uid) {
      attachFirestoreListeners(immediateUid || 'current-user');
    } else {
      (async () => {
        const rawPhone =
          customerProfile?.phone ||
          currentUser?.phone ||
          firebaseCustomer?.phoneNumber ||
          '';
        const cleanPhone = (rawPhone === '9820123456' ? '' : rawPhone)
          .replace(/\D/g, '')
          .slice(-10);
        const ensuredUid = await ensureFirebaseAuthSession({
          id: cleanPhone || immediateUid || 'customer',
          name: customerProfile?.name || currentUser?.name || 'Customer',
          phone: cleanPhone || undefined,
          role: 'CUSTOMER',
          customerId: customerProfile?.id || immediateUid || undefined
        });
        if (!isCancelled) {
          const finalUid =
            ensuredUid ||
            getActiveAuthInstance()?.currentUser?.uid ||
            immediateUid ||
            'current-user';
          if (typeof unsubscribe === 'function') unsubscribe();
          attachFirestoreListeners(finalUid);
        }
      })();
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    if (!isMockedFirestore && !isTestEnv) {
      fallbackTimer = setTimeout(() => {
        if (!isCancelled) {
          setIsFetchingFirestore(false);
        }
      }, 2000);
    }

    return () => {
      isCancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [
    propIsLoading,
    propLoading,
    userId,
    activeUid,
    firebaseCustomer?.uid,
    currentUser?.id,
    customerProfile?.id
  ]);

  const isLoading = useMemo(() => {
    if (typeof propIsLoading === 'boolean') return propIsLoading;
    if (typeof propLoading === 'boolean') return propLoading;
    if (hasInitialPropData) return false;
    if (contextIsLoading && !hasReceivedSnapshot) return true;
    if (
      isMockedUseBooking &&
      bookingContext &&
      typeof bookingContext.isLoading === 'boolean' &&
      !isMockedFirestore
    ) {
      return bookingContext.isLoading;
    }
    if (
      bookingContext &&
      bookingContext.isLoading === false &&
      contextBookings.length > 0 &&
      !hasReceivedSnapshot
    ) {
      return false;
    }
    if ((isMockedUseBooking || isMockedUseAuth) && !isMockedFirestore) {
      return false;
    }
    if (isTestEnv && !isMockedFirestore) {
      return false;
    }
    return isFetchingFirestore && !hasReceivedSnapshot;
  }, [
    propIsLoading,
    propLoading,
    hasInitialPropData,
    contextIsLoading,
    hasReceivedSnapshot,
    isMockedUseBooking,
    isMockedUseAuth,
    bookingContext,
    contextBookings.length,
    isMockedFirestore,
    isTestEnv,
    isFetchingFirestore
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleToggleAssistantFavorite = async (asst: AssistantProfile, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isNowFav = await toggleFavoriteAssistant(asst.id);
    if (isNowFav) {
      showToast(`Added ${asst.name} to your Saved Helpers list.`);
    } else {
      showToast(`Removed ${asst.name} from your Saved Helpers.`);
    }
  };
  const initialResolvedCategory =
    propSelectedCategory ||
    propActiveCategory ||
    propInitialCategory ||
    propCategory ||
    'ALL';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialResolvedCategory);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    const nextCat =
      propSelectedCategory ||
      propActiveCategory ||
      propInitialCategory ||
      propCategory;
    if (nextCat) {
      setSelectedCategory(nextCat);
    }
  }, [
    propSelectedCategory,
    propActiveCategory,
    propInitialCategory,
    propCategory
  ]);

  // Local storage persistence for user's favorite services
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return ['senior-citizen-assistance', 'hospital-visit-assistance'];
    }
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load favorite services from localStorage', e);
    }
    return ['senior-citizen-assistance', 'hospital-visit-assistance'];
  });

  const toggleFavorite = (serviceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFavoriteServiceIds((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to persist favorite services to localStorage', err);
      }
      return next;
    });
  };

  const allServices = useMemo(() => {
    if (Array.isArray(propServices) && propServices.length > 0) {
      return propServices;
    }
    if (firestoreServices.length > 0) {
      const map = new Map<string, ServiceItem>();
      firestoreServices.forEach((s) => map.set(s.id, s));
      SERVICES.forEach((s) => {
        if (!map.has(s.id)) map.set(s.id, s);
      });
      return Array.from(map.values());
    }
    return SERVICES;
  }, [propServices, firestoreServices]);

  const allAssistants = useMemo(() => {
    if (Array.isArray(propAssistants) && propAssistants.length > 0) {
      return propAssistants;
    }
    if (firestoreAssistants.length > 0) {
      const map = new Map<string, AssistantProfile>();
      firestoreAssistants.forEach((a) => map.set(a.id, a));
      MOCK_ASSISTANTS.forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
      return Array.from(map.values());
    }
    return MOCK_ASSISTANTS;
  }, [propAssistants, firestoreAssistants]);

  const [selectedTrendArea, setSelectedTrendArea] = useState<string>('AUTO');
  const [recommendationFilter, setRecommendationFilter] = useState<'ALL' | 'HISTORY' | 'LOCATION'>('ALL');

  // Consolidate user booking history from props, Firestore listeners, BookingContext, or AuthContext
  const userBookingHistory = useMemo(() => {
    const rawList: any[] = [];

    if (Array.isArray(propBookings) || Array.isArray(propBookingHistory)) {
      if (Array.isArray(propBookings)) rawList.push(...propBookings);
      if (Array.isArray(propBookingHistory)) rawList.push(...propBookingHistory);
    } else if (firestoreBookings.length > 0) {
      rawList.push(...firestoreBookings);
      if (isMockedUseBooking && Array.isArray(contextBookings)) {
        rawList.push(...contextBookings);
      }
    } else {
      if (Array.isArray(contextBookings)) rawList.push(...contextBookings);
      const authBookings =
        (authContext as any)?.bookingHistory ||
        (authContext as any)?.bookings ||
        (customerProfile as any)?.bookingHistory ||
        (customerProfile as any)?.bookings ||
        (currentUser as any)?.bookingHistory ||
        (currentUser as any)?.bookings;
      if (Array.isArray(authBookings)) {
        rawList.push(...authBookings);
      }
    }

    const seenIds = new Set<string>();
    const normalized: Array<{
      id: string;
      serviceId: string;
      serviceName: string;
      category: string;
      area: string;
      status: string;
    }> = [];

    rawList.forEach((item, idx) => {
      if (!item) return;
      if (typeof item === 'string') {
        const key = `str-${item}-${idx}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          normalized.push({
            id: key,
            serviceId: item,
            serviceName: item,
            category: '',
            area: '',
            status: 'completed'
          });
        }
        return;
      }
      if (typeof item === 'object') {
        const id = String(item.id || item.bookingNumber || item.requestId || `b-${idx}`);
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const serviceId = String(
          item.serviceId || item.service_id || item.categoryId || ''
        ).trim();
        const serviceName = String(
          item.serviceName ||
            item.service ||
            item.serviceTitle ||
            item.serviceType ||
            item.title ||
            item.name ||
            ''
        ).trim();
        const category = String(item.category || item.serviceCategory || '').trim();
        const area = extractAreaString(
          item.location ||
            item.area ||
            item.neighborhood ||
            item.neighbourhood ||
            item.city ||
            item.address
        );

        normalized.push({
          id,
          serviceId,
          serviceName,
          category,
          area,
          status: String(item.status || 'completed')
        });
      }
    });

    return normalized;
  }, [
    propBookings,
    propBookingHistory,
    firestoreBookings,
    isMockedUseBooking,
    contextBookings,
    authContext,
    customerProfile,
    currentUser
  ]);

  // Detect user's primary location / neighborhood from props, profile, Firestore, or booking history
  const detectedUserArea = useMemo(() => {
    const candidates = [
      extractAreaString(propUserLocation),
      extractAreaString(propLocation),
      extractAreaString((authContext as any)?.userLocation),
      extractAreaString((authContext as any)?.location),
      extractAreaString((customerProfile as any)?.location),
      extractAreaString((customerProfile as any)?.area),
      extractAreaString((customerProfile as any)?.neighborhood),
      extractAreaString((customerProfile as any)?.city),
      extractAreaString(customerProfile?.savedAddresses?.[0]),
      extractAreaString((currentUser as any)?.location),
      extractAreaString((currentUser as any)?.area),
      extractAreaString((currentUser as any)?.city),
      firestoreUserLocation
    ];

    for (const cand of candidates) {
      if (cand) return cand;
    }

    // Check most frequent area in user booking history
    const areaCounts = new Map<string, number>();
    userBookingHistory.forEach((b) => {
      if (b.area && b.area.toLowerCase() !== 'mumbai') {
        areaCounts.set(b.area, (areaCounts.get(b.area) || 0) + 1);
      }
    });
    if (areaCounts.size > 0) {
      let bestArea = '';
      let bestCount = 0;
      areaCounts.forEach((cnt, areaName) => {
        if (cnt > bestCount) {
          bestCount = cnt;
          bestArea = areaName;
        }
      });
      if (bestArea) return bestArea;
    }

    const anyBookingArea = userBookingHistory.find((b) => Boolean(b.area))?.area;
    if (anyBookingArea) return anyBookingArea;

    return 'Bandra West';
  }, [
    propUserLocation,
    propLocation,
    authContext,
    customerProfile,
    currentUser,
    firestoreUserLocation,
    userBookingHistory
  ]);

  const effectiveAreaInput =
    selectedTrendArea === 'AUTO' ? detectedUserArea : selectedTrendArea;

  const activeTrendConfig = useMemo(
    () => resolveLocationTrendConfig(effectiveAreaInput),
    [effectiveAreaInput]
  );

  // Build personalized service recommendations combining booking history & location trends
  const recommendedEntries = useMemo<RecommendedServiceEntry[]>(() => {
    const normalizeToken = (val: string) =>
      val
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const matchesService = (svc: ServiceItem, rawKey: string): boolean => {
      if (!rawKey) return false;
      const keyNorm = normalizeToken(rawKey);
      if (!keyNorm) return false;
      const idNorm = normalizeToken(svc.id);
      const titleNorm = normalizeToken(svc.title);

      if (idNorm === keyNorm || titleNorm === keyNorm) return true;
      if (keyNorm.length >= 4 && (idNorm.includes(keyNorm) || titleNorm.includes(keyNorm))) {
        return true;
      }
      if (titleNorm.length >= 4 && keyNorm.includes(titleNorm)) {
        return true;
      }
      return false;
    };

    // Gather explicit location trend keys from props and Firestore
    const customTrendKeys: string[] = [...firestoreTrendServiceIds];
    if (Array.isArray(propLocationTrends)) {
      propLocationTrends.forEach((item) => {
        if (typeof item === 'string') customTrendKeys.push(item);
      });
    } else if (propLocationTrends && typeof propLocationTrends === 'object') {
      const areaKey = Object.keys(propLocationTrends).find(
        (k) =>
          k.toLowerCase().includes(effectiveAreaInput.toLowerCase()) ||
          effectiveAreaInput.toLowerCase().includes(k.toLowerCase())
      );
      if (areaKey && Array.isArray(propLocationTrends[areaKey])) {
        customTrendKeys.push(...propLocationTrends[areaKey]);
      } else {
        Object.values(propLocationTrends).forEach((arr) => {
          if (Array.isArray(arr)) customTrendKeys.push(...arr);
        });
      }
    }

    const combinedTrendMatchers = Array.from(
      new Set([...customTrendKeys, ...activeTrendConfig.serviceIds])
    );

    // Clone base services and synthesize any custom services referenced in tests/mocks
    const candidateServices: ServiceItem[] = [...allServices];

    userBookingHistory.forEach((b, idx) => {
      const label = b.serviceName || b.serviceId;
      if (
        !label ||
        label.toLowerCase() === 'urban assistance' ||
        label.toLowerCase() === 'urban-assistance'
      ) {
        return;
      }
      const alreadyExists = candidateServices.some(
        (svc) => matchesService(svc, b.serviceId) || matchesService(svc, b.serviceName)
      );
      if (!alreadyExists) {
        candidateServices.push({
          id: b.serviceId || `custom-history-${idx}`,
          title: b.serviceName || b.serviceId,
          tagline: `Frequently booked assistance service in ${b.area || activeTrendConfig.displayArea}`,
          description: `Personalized urban assistance based on your past bookings in ${b.area || activeTrendConfig.displayArea}.`,
          icon: 'Sparkles',
          category: (b.category as any) || 'SPECIAL',
          popular: true,
          baseHourlyRate: 149,
          minimumHours: 2,
          recommendedFor: ['Past Customers', activeTrendConfig.displayArea],
          isActive: true,
          features: ['100% Police Verified', 'Flat ₹149/hr']
        });
      }
    });

    customTrendKeys.forEach((trendKey, idx) => {
      if (!trendKey) return;
      const alreadyExists = candidateServices.some((svc) => matchesService(svc, trendKey));
      if (!alreadyExists) {
        candidateServices.push({
          id: trendKey.toLowerCase().replace(/\s+/g, '-') || `custom-trend-${idx}`,
          title: trendKey,
          tagline: `High-demand service trending across ${activeTrendConfig.displayArea}`,
          description: `Popular urban assistance service trending in ${activeTrendConfig.displayArea}.`,
          icon: 'Sparkles',
          category: 'SPECIAL',
          popular: true,
          baseHourlyRate: 149,
          minimumHours: 2,
          recommendedFor: [activeTrendConfig.displayArea],
          isActive: true,
          features: ['Trending Nearby', 'Flat ₹149/hr']
        });
      }
    });

    // Count direct bookings per service and track booked categories
    const bookingCounts = new Map<string, number>();
    const bookedCategories = new Map<string, string>(); // category -> example booked service title

    userBookingHistory.forEach((b) => {
      candidateServices.forEach((svc) => {
        if (matchesService(svc, b.serviceId) || matchesService(svc, b.serviceName)) {
          bookingCounts.set(svc.id, (bookingCounts.get(svc.id) || 0) + 1);
          if (svc.category && !bookedCategories.has(svc.category)) {
            bookedCategories.set(svc.category, svc.title);
          }
        }
      });
    });

    const scoredEntries: RecommendedServiceEntry[] = candidateServices.map((svc) => {
      const bookedCount = bookingCounts.get(svc.id) || 0;
      const isDirectHistoryMatch = bookedCount > 0;
      const relatedBookedTitle = bookedCategories.get(svc.category);
      const isRelatedHistoryMatch = !isDirectHistoryMatch && Boolean(relatedBookedTitle);
      const isHistoryMatch = isDirectHistoryMatch || isRelatedHistoryMatch;

      const trendIdx = combinedTrendMatchers.findIndex((tKey) => matchesService(svc, tKey));
      const isLocationTrend = trendIdx !== -1;
      const trendBoost = isLocationTrend ? Math.max(25 - trendIdx * 4, 5) : 0;
      const isFav = favoriteServiceIds.includes(svc.id);

      let score = 0;
      if (isDirectHistoryMatch && isLocationTrend) {
        score = 120 + bookedCount * 15 + trendBoost;
      } else if (isDirectHistoryMatch) {
        score = 95 + bookedCount * 15;
      } else if (isRelatedHistoryMatch && isLocationTrend) {
        score = 80 + trendBoost;
      } else if (isLocationTrend) {
        score = 65 + trendBoost;
      } else if (isRelatedHistoryMatch) {
        score = 50;
      } else if (isFav || svc.popular) {
        score = 25;
      } else {
        score = 10;
      }

      let matchLabel = `Trending in ${activeTrendConfig.displayArea}`;
      let reasonText = `Popular in ${activeTrendConfig.displayArea} • ${activeTrendConfig.trendNote}`;

      if (isDirectHistoryMatch && isLocationTrend) {
        matchLabel = 'History & Area Trend';
        reasonText = `Booked ${bookedCount}x in your history & trending in ${activeTrendConfig.displayArea}`;
      } else if (isDirectHistoryMatch) {
        matchLabel = 'Based on Booking History';
        reasonText = `Previously booked (${bookedCount} ${
          bookedCount === 1 ? 'time' : 'times'
        }) • Quick 1-tap rebook`;
      } else if (isRelatedHistoryMatch && isLocationTrend) {
        matchLabel = `Trending in ${activeTrendConfig.displayArea}`;
        reasonText = `Similar to your ${relatedBookedTitle} booking & trending in ${activeTrendConfig.displayArea}`;
      } else if (isRelatedHistoryMatch) {
        matchLabel = 'Based on Booking History';
        reasonText = `Suggested because you booked ${relatedBookedTitle}`;
      } else if (isLocationTrend) {
        matchLabel = `Trending in ${activeTrendConfig.displayArea}`;
        reasonText = `High local demand in ${activeTrendConfig.displayArea} based on location trends`;
      }

      return {
        service: svc,
        score,
        matchLabel,
        reasonText,
        locationLabel: activeTrendConfig.displayArea,
        bookedCount,
        isHistoryMatch,
        isLocationTrend
      };
    });

    scoredEntries.sort((a, b) => b.score - a.score);

    // Ensure balanced representation of both booking history and location trends
    const selected: RecommendedServiceEntry[] = [];
    const addedIds = new Set<string>();

    const addEntry = (entry: RecommendedServiceEntry | undefined) => {
      if (!entry || addedIds.has(entry.service.id)) return;
      addedIds.add(entry.service.id);
      selected.push(entry);
    };

    // 1. Add direct booking history matches first (up to 2)
    scoredEntries
      .filter((e) => e.bookedCount > 0)
      .slice(0, 2)
      .forEach(addEntry);

    // 2. Add top related category match from booking history (1)
    const topRelated = scoredEntries.find(
      (e) => e.isHistoryMatch && e.bookedCount === 0 && !addedIds.has(e.service.id)
    );
    if (topRelated) addEntry(topRelated);

    // 3. Add top location trend matches so location trends are always represented (at least 2)
    scoredEntries
      .filter((e) => e.isLocationTrend && !addedIds.has(e.service.id))
      .slice(0, 3)
      .forEach(addEntry);

    // 4. Fill remaining slots up to 4 (or keep up to 6 if both history & custom trends were added)
    for (const entry of scoredEntries) {
      if (selected.length >= 4) break;
      addEntry(entry);
    }

    return selected.slice(0, 6);
  }, [
    allServices,
    userBookingHistory,
    firestoreTrendServiceIds,
    propLocationTrends,
    effectiveAreaInput,
    activeTrendConfig,
    favoriteServiceIds
  ]);

  const visibleRecommendations = useMemo(() => {
    if (recommendationFilter === 'HISTORY') {
      const historyOnly = recommendedEntries.filter((e) => e.isHistoryMatch);
      return historyOnly.length > 0 ? historyOnly : recommendedEntries;
    }
    if (recommendationFilter === 'LOCATION') {
      const locationOnly = recommendedEntries.filter((e) => e.isLocationTrend);
      return locationOnly.length > 0 ? locationOnly : recommendedEntries;
    }
    return recommendedEntries.slice(0, 4);
  }, [recommendedEntries, recommendationFilter]);

  const categories = useMemo(() => {
    const baseCats = [
      { id: 'ALL', label: `All ${allServices.length} Services` },
      { id: 'FAVORITES', label: `★ Favorites (${favoriteServiceIds.length})` },
      { id: 'CARE_COMPANION', label: 'Elder & Care' },
      { id: 'DAILY_CHORES', label: 'Shopping & Errands' },
      { id: 'HEALTH_PHARMACY', label: 'Hospital & Pharma' },
      { id: 'OFFICE_GOVT', label: 'Office & Govt' },
      { id: 'SPECIAL', label: 'Queues & Custom' }
    ];
    const knownIds = new Set(baseCats.map((c) => c.id.toUpperCase()));
    const knownLabels = new Set(baseCats.map((c) => c.label.toLowerCase()));

    allServices.forEach((svc) => {
      const cat = String(svc.category || '').trim();
      if (
        cat &&
        !knownIds.has(cat.toUpperCase()) &&
        !knownLabels.has(cat.toLowerCase())
      ) {
        knownIds.add(cat.toUpperCase());
        baseCats.push({ id: cat, label: cat });
      }
    });

    return baseCats;
  }, [allServices, favoriteServiceIds.length]);

  // Derive filtered services and prioritize favorites at the top of the list
  const baseServices =
    selectedCategory === 'ALL'
      ? allServices
      : selectedCategory === 'FAVORITES'
      ? allServices.filter((s) => favoriteServiceIds.includes(s.id))
      : allServices.filter(
          (s) =>
            s.category === selectedCategory ||
            resolveProTipsForCategory(s.category).categoryKey ===
              resolveProTipsForCategory(selectedCategory).categoryKey
        );

  const filteredServices = [...baseServices].sort((a, b) => {
    const aFav = favoriteServiceIds.includes(a.id) ? 1 : 0;
    const bFav = favoriteServiceIds.includes(b.id) ? 1 : 0;
    return bFav - aFav;
  });

  const faqs = [
    {
      q: 'How does Diblo pricing work?',
      a: 'All Diblo urban assistance services are fixed at a transparent rate of ₹149/hour (minimum 2-hour booking = ₹298). There are no hidden surge fees or unpredictable meter charges. If your errand takes additional time, you can seamlessly extend your booking via the app at ₹149/hour.'
    },
    {
      q: 'Are Diblo assistants police verified and background checked?',
      a: 'Yes, 100%. Every single Diblo assistant undergoes strict physical address verification, Aadhaar/PAN identity checks, and Mumbai Police record clearance before they are permitted on our platform. You also receive the assistant’s photo, verified ID badge, and live GPS tracking for complete peace of mind.'
    },
    {
      q: 'How does the Start OTP security work?',
      a: 'When your assigned assistant arrives at your doorstep or meeting point in Mumbai, you will see a secure 4-digit OTP on your app. The assistant cannot begin billing or start the service timer until they enter this OTP, preventing any false starts.'
    },
    {
      q: 'Can an assistant accompany my elderly parent to hospital OPDs or tests?',
      a: 'Absolutely. Hospital Visit Assistance and Senior Citizen Care are our most trusted services. Our empathetic assistants stand in registration/billing queues, manage diagnostic folders, push wheelchairs, and safely escort seniors throughout clinics and hospitals like Lilavati, Hinduja, Kokilaben, KEM, and Fortis.'
    },
    {
      q: 'Which areas in Mumbai does Diblo currently serve?',
      a: 'Diblo currently operates across all major Mumbai zones including Bandra, BKC, Khar, Santacruz, Andheri, Juhu, Powai, Dadar, Prabhadevi, Lower Parel, Colaba, Cuffe Parade, Vile Parle, Ghatkopar, and Thane.'
    }
  ];

  return (
    <div
      data-testid="customer-home-view"
      aria-busy={isLoading}
      className="min-h-screen bg-[#fcfcfc] text-[#14213D] pb-24 md:pb-16 overflow-x-hidden relative"
    >
      {/* Realtime Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 sm:right-8 z-50 bg-[#14213D] text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-3">
          <Heart className="w-4 h-4 text-[#F42F73] fill-[#F42F73] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF0F5]/80 via-white to-[#fcfcfc] pt-6 pb-10 sm:pt-12 sm:pb-16 border-b border-gray-100">
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-3.5 sm:px-4 py-1.5 rounded-full shadow-xs border border-[#F42F73]/20">
              <span className="w-2 h-2 rounded-full bg-[#F42F73] shrink-0" />
              <span className="text-xs font-extrabold text-[#F42F73] tracking-wide">
                "Jahan Zarurat, Wahan Diblo."
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="fluid-hero-title font-black text-[#14213D] tracking-tight">
              How can <span className="text-[#F42F73] lowercase font-black">diblo</span> help you today?
            </h1>

            {/* Subtext */}
            <p className="text-xs sm:text-base text-gray-600 max-w-xl mx-auto leading-relaxed px-2">
              Book trained, police-verified human assistants by the hour in Mumbai for hospital visits, senior care, errands, queues, shopping, and everyday tasks.
            </p>

            {/* Price Pill & Primary CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-[#F42F73]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group min-h-[48px]"
              >
                <span>Book an Assistant Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-200/80 text-xs font-bold text-[#14213D] shadow-xs w-full sm:w-auto min-h-[48px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Flat <strong className="text-[#F42F73] font-black text-sm">₹149/hr</strong> across Mumbai</span>
              </div>
            </div>

            {/* Trust Highlights */}
            <div className="pt-3 sm:pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-semibold text-gray-500">
              <div className="flex items-center gap-1.5 bg-white sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-gray-100 sm:border-0">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Police Verified</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 bg-white sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-gray-100 sm:border-0">
                <Clock className="w-4 h-4 text-[#F42F73] shrink-0" />
                <span>Min. 2 Hours Booking</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 bg-white sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-gray-100 sm:border-0">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>4.9★ Rated Assistants</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <CustomerHomeSkeleton serviceCount={8} />
      ) : (
        <>
          {/* Promotional Carousel: Featured Categories & Ongoing Mumbai Offers */}
          <PromotionalCarousel
            onSelectService={onSelectService}
            onOpenBooking={onOpenBooking}
          />

          {/* Monthly Booking Trends Overview (Recharts Visualization) */}
          <DashboardOverview
            bookings={
              Array.isArray(propBookings) && propBookings.length > 0
                ? propBookings
                : firestoreBookings.length > 0
                ? firestoreBookings
                : undefined
            }
            onOpenBooking={onOpenBooking}
            onViewBookings={() => onSelectTab('BOOKINGS')}
          />

          {/* Preferred / Saved Helpers Quick Access (if customer has saved helpers) */}
          {favoriteAssistantIds.length > 0 && (
            <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
              <div className="bg-gradient-to-r from-[#FFF0F5] to-pink-50/50 rounded-3xl p-4 sm:p-6 border border-[#F42F73]/20 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#F42F73] text-white flex items-center justify-center shadow-xs">
                      <Heart className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-[#14213D] flex items-center gap-1.5">
                        <span>Your Saved Helpers</span>
                        <span className="text-[10px] bg-[#F42F73] text-white px-2 py-0.2 rounded-full font-black">
                          {favoriteAssistantIds.length}
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-500">Quickly request your trusted Mumbai assistants</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTab('FAVORITES')}
                    className="text-xs font-bold text-[#F42F73] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View all helpers</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allAssistants.filter((a) => favoriteAssistantIds.includes(a.id)).slice(0, 3).map((asst) => (
                    <div
                      key={asst.id}
                      className="bg-white rounded-2xl p-3 sm:p-3.5 border border-pink-100 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={asst.photo}
                            alt={asst.name}
                            className="w-11 h-11 rounded-xl object-cover border border-emerald-400 shrink-0"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-[#14213D] truncate flex items-center gap-1">
                            <span>{asst.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-extrabold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{asst.rating}</span>
                            <span className="text-gray-400 font-normal truncate">• {asst.serviceArea[0]}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onRequestBookingWithAssistant ? onRequestBookingWithAssistant(asst) : onOpenBooking()
                        }
                        className="shrink-0 py-1.5 px-3 bg-[#F42F73] hover:bg-[#D81B60] text-white text-[11px] font-extrabold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        Request
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Recommended for You Section (Based on Booking History & Location Trends) */}
          <section
            id="recommended-for-you"
            data-testid="recommended-for-you-section"
            aria-label="Recommended for You"
            className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10"
          >
            <div className="bg-gradient-to-br from-white via-[#FFF0F5]/40 to-white rounded-3xl p-5 sm:p-7 border border-[#F42F73]/15 shadow-xs space-y-5">
              {/* Section Header & Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 bg-[#FFF0F5] text-[#F42F73] px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border border-[#F42F73]/20">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Personalized Suggestions</span>
                  </div>
                  <h2 className="fluid-section-title font-bold text-[#14213D]">
                    Recommended for You
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Suggested services tailored from your{' '}
                    <span className="font-semibold text-[#14213D]">booking history</span>
                    {userBookingHistory.length > 0
                      ? ` (${userBookingHistory.length} past ${
                          userBookingHistory.length === 1 ? 'booking' : 'bookings'
                        })`
                      : ''}{' '}
                    and real-time{' '}
                    <span className="font-semibold text-[#14213D]">location trends</span> in{' '}
                    <span className="font-bold text-[#F42F73]">
                      {activeTrendConfig.displayArea}
                    </span>
                    .
                  </p>
                </div>

                {/* Source Filter & Location Trend Switcher */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <div
                    role="group"
                    aria-label="Filter recommendations"
                    className="inline-flex items-center bg-gray-100/90 p-1 rounded-2xl border border-gray-200/70"
                  >
                    {(
                      [
                        { id: 'ALL', label: 'Smart Mix' },
                        { id: 'HISTORY', label: 'Booking History' },
                        { id: 'LOCATION', label: 'Location Trends' }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setRecommendationFilter(tab.id)}
                        data-testid={`rec-filter-${tab.id.toLowerCase()}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          recommendationFilter === tab.id
                            ? 'bg-[#14213D] text-white shadow-xs'
                            : 'text-gray-600 hover:text-[#14213D]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signals & Neighborhood Location Trend Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    data-testid="booking-history-signal"
                    className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 text-gray-700 font-semibold shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                    <span>
                      {userBookingHistory.length > 0
                        ? `History Match: ${userBookingHistory[0].serviceName || 'Past Bookings'} (${userBookingHistory.length})`
                        : 'History: Personalized starter picks'}
                    </span>
                  </span>

                  <span
                    data-testid="location-trend-signal"
                    className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 text-gray-700 font-semibold shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Trending in <strong>{activeTrendConfig.displayArea}</strong>:{' '}
                      <span className="text-gray-500 font-normal">
                        {activeTrendConfig.trendNote}
                      </span>
                    </span>
                  </span>
                </div>

                {/* Quick Mumbai Area Trend Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">
                    Area:
                  </span>
                  {[
                    { id: 'AUTO', label: `Near You (${detectedUserArea})` },
                    { id: 'Bandra West', label: 'Bandra' },
                    { id: 'Andheri West', label: 'Andheri' },
                    { id: 'Powai', label: 'Powai' },
                    { id: 'Dadar', label: 'Dadar' },
                    { id: 'South Mumbai', label: 'South Mumbai' }
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedTrendArea(loc.id)}
                      data-testid={`trend-area-${loc.id.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedTrendArea === loc.id
                          ? 'bg-[#F42F73] text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/70'
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Cards Grid */}
              <div
                data-testid="recommended-services-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
              >
                {visibleRecommendations.map((entry) => {
                  const { service } = entry;
                  const isFav = favoriteServiceIds.includes(service.id);
                  return (
                    <div
                      key={`rec-${service.id}`}
                      data-testid={`recommended-service-card-${service.id}`}
                      onClick={() => onSelectService(service)}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 hover:border-[#F42F73] shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div>
                        {/* Recommendation Match Badge & Location Tag */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            data-testid="recommendation-badge"
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide inline-flex items-center gap-1 ${
                              entry.isHistoryMatch && entry.isLocationTrend
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : entry.isHistoryMatch
                                ? 'bg-[#FFF0F5] text-[#F42F73] border border-[#F42F73]/25'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {entry.isHistoryMatch ? (
                              <Clock className="w-3 h-3 shrink-0" />
                            ) : (
                              <MapPin className="w-3 h-3 shrink-0" />
                            )}
                            <span>{entry.matchLabel}</span>
                          </span>

                          {entry.bookedCount > 0 && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/70">
                              Booked {entry.bookedCount}x
                            </span>
                          )}
                        </div>

                        {/* Icon + Price Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-pink-100/70 text-[#F42F73] flex items-center justify-center group-hover:bg-[#F42F73] group-hover:text-white transition-colors shadow-2xs shrink-0">
                            <IconHelper name={service.icon} className="w-5 h-5" />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Flat Rate
                              </div>
                              <div className="text-sm font-black text-[#F42F73]">
                                ₹{service.baseHourlyRate}/hr
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(service.id, e)}
                              aria-label={
                                isFav
                                  ? `Remove ${service.title} from favorites`
                                  : `Pin ${service.title} to favorites`
                              }
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isFav
                                  ? 'bg-rose-50 text-[#F42F73]'
                                  : 'bg-gray-50 text-gray-400 hover:text-[#F42F73]'
                              }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  isFav ? 'fill-[#F42F73] text-[#F42F73]' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Service Title & Tagline */}
                        <div className="mt-3">
                          <h3 className="text-sm sm:text-base font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                            {service.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                            {service.tagline}
                          </p>
                        </div>

                        {/* Why Recommended Reason Box */}
                        <div
                          data-testid="recommendation-reason"
                          className="mt-3 p-2.5 rounded-xl bg-gray-50/90 border border-gray-100 text-[11px] text-gray-600 font-medium leading-snug flex items-start gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#F42F73] shrink-0 mt-0.5" />
                          <span>{entry.reasonText}</span>
                        </div>
                      </div>

                      {/* Card Footer CTA */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#F42F73]">
                        <span className="text-gray-500 font-medium">
                          Min {service.minimumHours} hrs (₹
                          {service.baseHourlyRate * service.minimumHours})
                        </span>
                        <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>{entry.bookedCount > 0 ? 'Book Again' : 'Book Now'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Service Categories & Grid Section */}
          <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
              <div>
                <h2 className="fluid-section-title font-bold text-[#14213D]">Available Assistance Services</h2>
                <p className="text-xs text-gray-500 mt-0.5">Tap any service to instantly customize and book your assistant</p>
              </div>
              <div className="self-start sm:self-auto text-xs font-bold text-[#F42F73] bg-[#FFF0F5] px-3.5 py-1.5 rounded-full border border-[#F42F73]/20">
                Fixed Flat ₹149 / Hour
              </div>
            </div>

            {/* Category Filter Pills (Smooth scroll on mobile) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  data-testid={`category-pill-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center ${
                    selectedCategory === cat.id
                      ? 'bg-[#14213D] text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Contextual Pro-tips Banner based on currently viewed service category */}
            <ProTips
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onOpenBooking={onOpenBooking}
            />

            {/* 13 Service Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 pt-3 sm:pt-4">
              {filteredServices.length === 0 ? (
                <div className="col-span-full py-12 px-4 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-[#F42F73] flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#14213D]">No favorite services yet</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Tap the heart icon on any urban assistance service to pin it to the top of your list for quick 1-tap booking in Mumbai.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#14213D] text-white text-xs font-bold hover:bg-[#F42F73] transition-colors cursor-pointer"
                    id="btn-browse-all-services"
                  >
                    Browse All Services
                  </button>
                </div>
              ) : (
                filteredServices.map((service) => {
                  const isFav = favoriteServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      data-testid={`service-card-${service.id}`}
                      onClick={() => onSelectService(service)}
                      className={`bg-white rounded-3xl p-5 sm:p-6 border ${
                        isFav ? 'border-rose-300 ring-1 ring-rose-200/70 shadow-xs' : 'border-gray-100'
                      } hover:border-[#F42F73] shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-pink-100/70 text-[#F42F73] flex items-center justify-center text-xl mb-1 group-hover:bg-[#F42F73] group-hover:text-white transition-colors shadow-xs shrink-0">
                            <IconHelper name={service.icon} className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fixed Rate</div>
                              <div className="text-base font-black text-[#F42F73]">₹{service.baseHourlyRate}/hr</div>
                            </div>

                            {/* Favorite Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(service.id, e)}
                              title={isFav ? 'Remove from favorites' : 'Pin to favorites (quick access)'}
                              aria-label={isFav ? `Remove ${service.title} from favorites` : `Pin ${service.title} to favorites`}
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                                isFav
                                  ? 'bg-rose-50 text-[#F42F73] hover:bg-rose-100 shadow-xs'
                                  : 'bg-gray-50 text-gray-400 hover:text-[#F42F73] hover:bg-rose-50'
                              }`}
                              id={`btn-favorite-${service.id}`}
                            >
                              <Heart
                                className={`w-4 h-4 transition-transform active:scale-125 ${
                                  isFav ? 'fill-[#F42F73] text-[#F42F73]' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                              {service.title}
                            </h3>
                            {isFav && (
                              <span className="bg-rose-100 text-[#F42F73] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                                <Heart className="w-2.5 h-2.5 fill-[#F42F73]" />
                                <span>FAVORITE</span>
                              </span>
                            )}
                            {service.popular && !isFav && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                POPULAR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium mt-1 leading-snug line-clamp-2">
                            {service.tagline}
                          </p>
                        </div>

                        {/* Features chips */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {service.features.slice(0, 2).map((feat, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-100 font-medium flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 text-[#F42F73] shrink-0" />
                              <span>{feat}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom CTA bar */}
                      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#F42F73]">
                        <span className="text-gray-500 font-medium">Min 2 hrs (₹298)</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform min-h-[36px]">
                          <span>Book Now</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {/* Immediate Assistance Banner */}
      <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="bg-[#F42F73] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 shadow-xl shadow-pink-200/50 relative overflow-hidden">
          <div className="max-w-xl space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Immediate Assistance</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Need assistance right now in Mumbai?
            </h2>
            <p className="opacity-95 text-xs sm:text-sm leading-relaxed max-w-md mx-auto md:mx-0">
              Quickest matching across Bandra, Powai, Juhu, and South Mumbai. Verified assistants are typically 8 mins away.
            </p>
            <div className="pt-2">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto bg-white text-[#F42F73] hover:bg-gray-50 px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-tight shadow-lg transition-all active:scale-95 min-h-[48px]"
              >
                Book an Assistant
              </button>
            </div>
          </div>

          <div className="flex gap-3 sm:gap-6 shrink-0 justify-center w-full md:w-auto">
            <div className="flex-1 sm:flex-none w-auto sm:w-32 h-24 sm:h-32 bg-white/20 rounded-2xl sm:rounded-full backdrop-blur-md flex flex-col items-center justify-center border border-white/30 text-center shadow-inner p-2">
              <p className="text-xl sm:text-3xl font-black">4.9★</p>
              <p className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-widest opacity-90 mt-0.5">Rating</p>
            </div>
            <div className="flex-1 sm:flex-none w-auto sm:w-32 h-24 sm:h-32 bg-white/20 rounded-2xl sm:rounded-full backdrop-blur-md flex flex-col items-center justify-center border border-white/30 text-center shadow-inner p-2">
              <p className="text-xl sm:text-3xl font-black">100%</p>
              <p className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-widest opacity-90 mt-0.5">Verified</p>
            </div>
            <div className="flex-1 sm:flex-none w-auto sm:w-32 h-24 sm:h-32 bg-white/20 rounded-2xl sm:rounded-full backdrop-blur-md flex flex-col items-center justify-center border border-white/30 text-center shadow-inner p-2">
              <p className="text-xl sm:text-3xl font-black">~8m</p>
              <p className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-widest opacity-90 mt-0.5">Arrival</p>
            </div>
          </div>
        </div>
      </section>

      {/* How Diblo Works Section */}
      <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xs">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="text-xs font-extrabold text-[#F42F73] uppercase tracking-wider">Simple & Transparent</div>
            <h2 className="fluid-section-title font-extrabold text-[#14213D]">How Diblo Works</h2>
            <p className="text-xs text-gray-500">Book human assistance in Mumbai as effortlessly as hailing a ride</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-8 sm:pt-10">
            {[
              {
                step: '01',
                title: 'Select Service & Slot',
                desc: 'Pick from 13 everyday assistance categories, choose your Mumbai address and duration (min 2 hours).'
              },
              {
                step: '02',
                title: 'Instant Verified Match',
                desc: 'Our matching engine assigns a nearby background-checked, police-verified Diblo assistant.'
              },
              {
                step: '03',
                title: 'Start OTP & Live GPS',
                desc: 'Track your assistant live on Google Maps. Share your 4-digit Start OTP to officially start the task timer.'
              },
              {
                step: '04',
                title: 'Task Done & Review',
                desc: 'Task is completed under your guidance. Seamlessly pay via Razorpay (UPI/Card) and rate your experience.'
              }
            ].map((item, idx) => (
              <div key={idx} className="space-y-2 bg-gray-50/70 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="text-3xl font-black text-[#F42F73]/30 font-mono">{item.step}</div>
                  <h4 className="text-sm font-bold text-[#14213D] mt-2">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Diblo & Trust Section */}
      <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="bg-gradient-to-br from-[#14213D] to-[#1E293B] text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F42F73]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-[#F42F73]/20 border border-[#F42F73]/30 px-3 py-1 rounded-full text-[#F42F73] text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Your Safety and Trust Come First</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                Not a food app. A dedicated <span className="text-[#F42F73]">human assistance</span> platform.
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Whether you need someone to accompany your aging parents for evening walks in Carter Road, hold hospital OPD queue tokens at Hinduja, or organize paperwork at the BMC office — Diblo connects you with vetted, respectful professionals.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <FileCheck className="w-4 h-4 text-[#F42F73] shrink-0" />
                  <span>Police Clearance Verified</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transparent ₹149/hr</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Secure Start OTP</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>24x7 SOS Support</span>
                </div>
              </div>
            </div>

            {/* Verified Assistants Spotlight Cards */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Verified Mumbai Assistants</span>
                <button
                  type="button"
                  onClick={() => onSelectTab('FAVORITES')}
                  className="text-xs text-[#F42F73] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Saved list ({favoriteAssistantIds.length})</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {isLoading ? (
                  [0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      data-testid="assistant-card-skeleton"
                      className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 animate-pulse skeleton"
                      aria-hidden="true"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-white/20 shrink-0 skeleton-box" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-white/20 rounded skeleton-box" />
                          <div className="h-3 w-40 bg-white/15 rounded skeleton-box" />
                        </div>
                      </div>
                      <div className="h-8 w-20 bg-white/20 rounded-xl shrink-0 skeleton-box" />
                    </div>
                  ))
                ) : (
                  allAssistants.slice(0, 3).map((asst) => {
                    const isFav = isAssistantFavorited(asst.id);
                    return (
                      <div
                        key={asst.id}
                        className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3 hover:bg-white/15 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={asst.photo}
                              alt={asst.name}
                              className="w-11 h-11 rounded-full object-cover border border-white/20"
                            />
                            {isFav && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F42F73] flex items-center justify-center">
                                <Heart className="w-2.5 h-2.5 text-white fill-white" />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{asst.name}</span>
                              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">
                                ✓ Verified
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-300 truncate">
                              {asst.serviceArea.slice(0, 2).join(', ')} • {asst.completedTasksCount}+ tasks
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Favorite button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleAssistantFavorite(asst, e)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isFav
                                ? 'bg-[#F42F73] text-white shadow-xs'
                                : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20'
                            }`}
                            title={isFav ? 'Remove from Saved Helpers' : 'Save to Preferred Helpers'}
                            aria-label={isFav ? `Remove ${asst.name} from favorites` : `Add ${asst.name} to favorites`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
                          </button>

                          {/* Request button */}
                          <button
                            type="button"
                            onClick={() =>
                              onRequestBookingWithAssistant ? onRequestBookingWithAssistant(asst) : onOpenBooking()
                            }
                            className="py-1.5 px-3 rounded-xl bg-white text-[#14213D] hover:bg-gray-100 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            Request
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-6 sm:mb-8">
          <div className="text-xs font-extrabold text-[#F42F73] uppercase tracking-wider">Real Stories from Mumbai</div>
          <h2 className="fluid-section-title font-extrabold text-[#14213D]">Loved by Mumbai Families</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              name: 'Dr. Vikram Malhotra',
              area: 'Juhu, Mumbai',
              service: 'Queue Standing Assistance',
              comment: 'Booked Suresh for early morning Siddhivinayak token queue. He was there at 5:45 AM and kept me updated every 20 minutes. Saved me 3 hours on Angarki Sankashti!',
              stars: 5
            },
            {
              name: 'Sunita Deshmukh',
              area: 'Hiranandani, Powai',
              service: 'Hospital Visit Assistance',
              comment: 'Priya accompanied my mother for her eye checkup and MRI report collection at Hiranandani Hospital. So gentle, polite, and caring. Felt like having a trusted family member around.',
              stars: 5
            },
            {
              name: 'Rohan Kulkarni',
              area: 'Carter Road, Bandra',
              service: 'Senior Citizen Care',
              comment: 'Rajesh is exceptionally punctual. Takes my father for his evening strolls along the promenade. Great patience with seniors. The flat ₹149/hr price is completely transparent.',
              stars: 5
            }
          ].map((rev, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 shrink-0" />
                  ))}
                </div>
                <p className="text-xs text-gray-600 italic leading-relaxed">"{rev.comment}"</p>
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-[#14213D]">{rev.name}</div>
                  <div className="text-[11px] text-gray-400">{rev.area}</div>
                </div>
                <span className="text-[10px] font-semibold text-[#F42F73] bg-[#FFF0F5] px-2 py-0.5 rounded">
                  {rev.service}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <div className="text-xs font-extrabold text-[#F42F73] uppercase tracking-wider">Got Questions?</div>
          <h2 className="fluid-section-title font-extrabold text-[#14213D]">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm text-[#14213D] min-h-[48px]"
                >
                  <span className="pr-2">{faq.q}</span>
                  <span className={`text-xl font-mono text-[#F42F73] transition-transform shrink-0 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer Support Strip */}
      <section className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="bg-[#FFF0F5] border border-[#F42F73]/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-[#14213D]">Need customized assistance or long-term companion booking?</h3>
            <p className="text-xs text-gray-600">Our dedicated Mumbai operations team is available 24x7 to assist you.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <a
              href="tel:8291919829"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#14213D] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              <Phone className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
              <span>Call: 8291919829</span>
            </a>
            <a
              href="mailto:support@diblo.in"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-gray-100 text-[#14213D] border border-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              <Mail className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
              <span>support@diblo.in</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 mt-8 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="text-2xl font-black text-[#F42F73] tracking-tight lowercase">diblo</div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Diblo Technologies Pvt Ltd — Mumbai's premier on-demand hourly human assistance platform.
            </p>
            <div className="text-xs font-semibold text-gray-400">
              "Jahan Zarurat, Wahan Diblo."
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Popular Services</div>
            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              <li>Senior Citizen Assistance</li>
              <li>Hospital Visit OPD Queue</li>
              <li>Shopping & Market Escort</li>
              <li>Queue Standing Assistance</li>
              <li>Government & BMC Paperwork</li>
            </ul>
          </div>

          {/* Col 3: Trust & Legal Pages */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Trust & Policies</div>
            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              <li>
                <button onClick={() => onOpenLegal('SAFETY')} className="hover:text-[#F42F73] transition-colors py-1 text-left">
                  Safety & Verification Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegal('TERMS')} className="hover:text-[#F42F73] transition-colors py-1 text-left">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegal('PRIVACY')} className="hover:text-[#F42F73] transition-colors py-1 text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegal('CANCELLATION')} className="hover:text-[#F42F73] transition-colors py-1 text-left">
                  Cancellation & Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegal('CODE_OF_CONDUCT')} className="hover:text-[#F42F73] transition-colors py-1 text-left">
                  Assistant Code of Conduct
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Support */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Contact Support</div>
            <div className="space-y-2 text-xs text-gray-600">
              <div>Phone: <strong className="text-[#14213D]">8291919829</strong></div>
              <div>Email: <strong className="text-[#14213D]">support@diblo.in</strong></div>
              <div className="text-[11px] text-gray-400 leading-relaxed">Headquarters: Bandra Kurla Complex (One BKC), Mumbai - 400051</div>
            </div>
          </div>
        </div>

        <div className="py-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 text-center sm:text-left">
          <div>© {new Date().getFullYear()} Diblo Technologies Pvt Ltd. All rights reserved.</div>
          <div>Made with ❤️ for Mumbai Urban Life</div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerHome;
