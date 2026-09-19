import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Ticket,
  Tag,
  Percent,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Stethoscope,
  ShoppingBag,
  Users,
  Building2,
  Clock,
  BadgePercent,
  Gift,
  MapPin
} from 'lucide-react';
import { ServiceItem } from '../../types';
import { SERVICES, MOCK_COUPONS } from '../../data/mockData';

interface PromotionalCarouselProps {
  onSelectService: (service: ServiceItem) => void;
  onOpenBooking: () => void;
}

type CarouselFilter = 'ALL' | 'OFFERS' | 'CATEGORIES';

interface PromoOfferItem {
  id: string;
  type: 'OFFER';
  code: string;
  title: string;
  badge: string;
  description: string;
  discountBadge: string;
  highlightText: string;
  validityText: string;
  accentBg: string;
  accentBorder: string;
  tagColor: string;
  icon: 'Ticket' | 'Percent' | 'BadgePercent' | 'Gift';
}

interface PromoCategoryItem {
  id: string;
  type: 'CATEGORY';
  serviceId: string;
  title: string;
  badge: string;
  tagline: string;
  hourlyRate: number;
  minHours: number;
  features: string[];
  mumbaiHotspot: string;
  accentBg: string;
  accentBorder: string;
  icon: 'HeartHandshake' | 'Stethoscope' | 'ShoppingBag' | 'Users' | 'Building2';
}

type CarouselItem = PromoOfferItem | PromoCategoryItem;

export const PromotionalCarousel: React.FC<PromotionalCarouselProps> = ({
  onSelectService,
  onOpenBooking
}) => {
  const [activeFilter, setActiveFilter] = useState<CarouselFilter>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Curated promotional carousel items (Offers & Featured Categories)
  const carouselItems: CarouselItem[] = [
    {
      id: 'offer-first',
      type: 'OFFER',
      code: 'DIBLOFIRST',
      title: 'Flat ₹100 Off Your First Booking',
      badge: 'WELCOME MUMBAI OFFER',
      description: 'Book police-verified human assistance for hospital visits, senior care, errands, or queue standing.',
      discountBadge: '₹100 OFF',
      highlightText: 'Valid across all Mumbai zones',
      validityText: 'Min 2 hours booking • Auto-applied at checkout',
      accentBg: 'from-rose-500/10 via-white to-pink-50/50',
      accentBorder: 'border-rose-200/80',
      tagColor: 'bg-rose-50 text-[#F42F73] border-rose-200',
      icon: 'Ticket'
    },
    {
      id: 'cat-senior',
      type: 'CATEGORY',
      serviceId: 'senior-citizen-assistance',
      title: 'Senior Citizen & Care Companion',
      badge: 'MOST TRUSTED IN MUMBAI',
      tagline: 'Compassionate companion for evening walks, clinics, park strolls & tech help.',
      hourlyRate: 149,
      minHours: 2,
      features: ['Police-verified with ID badge', 'Emergency first-aid trained', 'Patience & utmost respect'],
      mumbaiHotspot: 'Bandra, Dadar, Juhu & South Bombay',
      accentBg: 'from-amber-500/10 via-white to-orange-50/40',
      accentBorder: 'border-amber-200/80',
      icon: 'HeartHandshake'
    },
    {
      id: 'offer-senior',
      type: 'OFFER',
      code: 'SENIORCARE10',
      title: '10% Off Elder & Hospital Care',
      badge: 'FAMILY WELLNESS SPECIAL',
      description: 'Dedicated patient escort, OPD queue standing, and medical report collection with zero stress.',
      discountBadge: '10% OFF',
      highlightText: 'Save up to ₹150 on healthcare visits',
      validityText: 'Min 3 hours • Lilavati, Hinduja, Kokilaben & Fortis',
      accentBg: 'from-emerald-500/10 via-white to-teal-50/40',
      accentBorder: 'border-emerald-200/80',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: 'Percent'
    },
    {
      id: 'cat-hospital',
      type: 'CATEGORY',
      serviceId: 'hospital-visit-assistance',
      title: 'Hospital OPD & Patient Escort',
      badge: 'ZERO QUEUE STRESS',
      tagline: 'Assistant handles registration lines, diagnostic token counters, wheelchair escort & pharmacy runs.',
      hourlyRate: 149,
      minHours: 2,
      features: ['OPD token queue management', 'Wheelchair & patient escort', 'Diagnostic report & medicine pickup'],
      mumbaiHotspot: 'Lilavati, Hinduja, KEM, Kokilaben & Tata Memorial',
      accentBg: 'from-blue-500/10 via-white to-sky-50/40',
      accentBorder: 'border-blue-200/80',
      icon: 'Stethoscope'
    },
    {
      id: 'offer-mumbai50',
      type: 'OFFER',
      code: 'MUMBAI50',
      title: 'Flat ₹50 Off Any Errand',
      badge: 'ALL 13 SERVICES',
      description: 'Crawford Market shopping, dry-cleaning pickup, bank visits, or urgent package drops.',
      discountBadge: '₹50 OFF',
      highlightText: 'Instant coupon across all categories',
      validityText: 'Min 2 hours booking • Valid citywide',
      accentBg: 'from-indigo-500/10 via-white to-violet-50/40',
      accentBorder: 'border-indigo-200/80',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: 'BadgePercent'
    },
    {
      id: 'cat-shopping',
      type: 'CATEGORY',
      serviceId: 'shopping-assistance',
      title: 'Market & Supermarket Shopping',
      badge: 'HEAVY LIFTING HANDLED',
      tagline: 'Assistance for grocery runs, wholesale mandis, apparel trials & festive shopping.',
      hourlyRate: 149,
      minHours: 2,
      features: ['Heavy bag & cart handling', 'Fresh produce quality checks', 'Itemized bill verification'],
      mumbaiHotspot: 'Crawford Market, Colaba, Linking Rd & Lokhandwala',
      accentBg: 'from-pink-500/10 via-white to-rose-50/40',
      accentBorder: 'border-pink-200/80',
      icon: 'ShoppingBag'
    },
    {
      id: 'offer-weekend',
      type: 'OFFER',
      code: 'WEEKEND20',
      title: '15% Off Weekend Multi-Errands',
      badge: 'WEEKEND RELAXATION',
      description: 'Spend your weekend resting while our verified assistant completes your multi-stop city errands.',
      discountBadge: '15% OFF',
      highlightText: 'Save up to ₹200 on 3+ hour tasks',
      validityText: 'Saturdays & Sundays • Unlimited errand stops',
      accentBg: 'from-purple-500/10 via-white to-fuchsia-50/40',
      accentBorder: 'border-purple-200/80',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'Gift'
    },
    {
      id: 'cat-queue',
      type: 'CATEGORY',
      serviceId: 'queue-standing-assistance',
      title: 'Queue Standing & Temple Darshan',
      badge: 'NEVER WAIT IN LINE',
      tagline: 'Punctual assistant stands in temple token lines, flash sales, ticket counters & event gates.',
      hourlyRate: 149,
      minHours: 2,
      features: ['Siddhivinayak & Lalbaug queue', 'Live spot handoff when turn nears', 'Real-time phone & SMS updates'],
      mumbaiHotspot: 'Prabhadevi, Lower Parel, BKC & Andheri',
      accentBg: 'from-amber-500/10 via-white to-yellow-50/40',
      accentBorder: 'border-amber-200/80',
      icon: 'Users'
    }
  ];

  // Filter items based on selected tab
  const filteredItems = carouselItems.filter((item) => {
    if (activeFilter === 'OFFERS') return item.type === 'OFFER';
    if (activeFilter === 'CATEGORIES') return item.type === 'CATEGORY';
    return true;
  });

  // Calculate scroll position and update navigation buttons
  const checkScrollBoundaries = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    } else {
      setScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollBoundaries();
    el.addEventListener('scroll', checkScrollBoundaries, { passive: true });
    window.addEventListener('resize', checkScrollBoundaries);

    return () => {
      el.removeEventListener('scroll', checkScrollBoundaries);
      window.removeEventListener('resize', checkScrollBoundaries);
    };
  }, [checkScrollBoundaries, filteredItems]);

  // Smooth scroll handler
  const handleScroll = (direction: 'LEFT' | 'RIGHT') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Card width (approx 340px) + gap (16px)
    const scrollAmount = Math.min(el.clientWidth * 0.8, 360);
    const targetScroll = direction === 'LEFT' ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  // Copy coupon code to clipboard with user feedback
  const handleCopyCoupon = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  // Select service card
  const handleCategoryClick = (serviceId: string) => {
    const service = SERVICES.find((s) => s.id === serviceId);
    if (service) {
      onSelectService(service);
    } else {
      onOpenBooking();
    }
  };

  return (
    <section
      id="promotional-carousel-section"
      className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10"
      aria-label="Promotional Carousel"
    >
      {/* Header bar with title, filter pills, and navigation controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-[#FFF0F5] text-[#F42F73] px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border border-[#F42F73]/20 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured in Mumbai</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#14213D] tracking-tight">
            Spotlight Categories & City Offers
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Flat ₹149/hr hourly rates, verified Mumbai assistants & limited-period coupon perks
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {/* Filter Pills */}
          <div className="inline-flex p-1 bg-gray-100 rounded-2xl text-xs font-bold text-gray-600 border border-gray-200/70">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white text-[#14213D] shadow-xs'
                  : 'hover:text-[#14213D]'
              }`}
              id="btn-filter-all"
            >
              All ({carouselItems.length})
            </button>
            <button
              onClick={() => setActiveFilter('OFFERS')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                activeFilter === 'OFFERS'
                  ? 'bg-white text-[#F42F73] shadow-xs'
                  : 'hover:text-[#14213D]'
              }`}
              id="btn-filter-offers"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Offers (4)</span>
            </button>
            <button
              onClick={() => setActiveFilter('CATEGORIES')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeFilter === 'CATEGORIES'
                  ? 'bg-white text-[#14213D] shadow-xs'
                  : 'hover:text-[#14213D]'
              }`}
              id="btn-filter-categories"
            >
              Services (4)
            </button>
          </div>

          {/* Scroll Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('LEFT')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition-all active:scale-95"
              id="btn-carousel-scroll-left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleScroll('RIGHT')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center shadow-xs transition-all active:scale-95"
              id="btn-carousel-scroll-right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x snap-mandatory scroll-smooth"
        id="promotional-carousel-track"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredItems.map((item) => {
          if (item.type === 'OFFER') {
            const isCopied = copiedCode === item.code;
            return (
              <div
                key={item.id}
                className={`snap-start shrink-0 w-[300px] sm:w-[340px] md:w-[360px] rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${item.accentBg} border ${item.accentBorder} shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group`}
              >
                {/* Decorative background badge mark */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-rose-500/5 pointer-events-none group-hover:scale-110 transition-transform duration-500" />

                <div>
                  {/* Top Bar: Badge & Discount Pill */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-500 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200/70">
                      {item.badge}
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#F42F73] text-white shadow-xs">
                      {item.discountBadge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg sm:text-xl font-black text-[#14213D] tracking-tight leading-snug group-hover:text-[#F42F73] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Highlight pill */}
                  <div className="mt-3.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-white/80 px-2.5 py-1 rounded-lg border border-gray-200/60">
                    <MapPin className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                    <span>{item.highlightText}</span>
                  </div>
                </div>

                {/* Bottom Section: Coupon Box & CTA */}
                <div className="mt-5 pt-3.5 border-t border-gray-200/80 space-y-2.5">
                  <div className="flex items-center justify-between bg-white rounded-2xl p-2 pl-3 border border-gray-200/90 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#F42F73] shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block -mb-0.5">
                          Coupon Code
                        </span>
                        <span className="font-mono font-black text-sm tracking-wider text-[#14213D]">
                          {item.code}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleCopyCoupon(item.code, e)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                      id={`btn-copy-${item.code}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-gray-500 font-medium truncate">
                      {item.validityText}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenBooking}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#F42F73] hover:text-[#D81B60] shrink-0 group/btn cursor-pointer py-1"
                      id={`btn-use-offer-${item.code}`}
                    >
                      <span>Book with Offer</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Featured Category Card
          return (
            <div
              key={item.id}
              onClick={() => handleCategoryClick(item.serviceId)}
              className={`snap-start shrink-0 w-[300px] sm:w-[340px] md:w-[360px] rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${item.accentBg} border ${item.accentBorder} shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer`}
            >
              {/* Decorative mark */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-navy-500/5 pointer-events-none group-hover:scale-110 transition-transform duration-500" />

              <div>
                {/* Top bar: Badge & Price */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-gray-600 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200/70">
                    {item.badge}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#14213D] bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-xs">
                      ₹{item.hourlyRate}/hr
                    </span>
                  </div>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-lg sm:text-xl font-black text-[#14213D] tracking-tight leading-snug group-hover:text-[#F42F73] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-2 leading-relaxed">
                  {item.tagline}
                </p>

                {/* Key feature bullets */}
                <div className="mt-3.5 space-y-1.5">
                  {item.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-[11px] font-medium text-gray-700"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Section: Hotspot & Book Now CTA */}
              <div className="mt-5 pt-3.5 border-t border-gray-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium truncate max-w-[190px]">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{item.mumbaiHotspot}</span>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#14213D] group-hover:bg-[#F42F73] text-white text-xs font-black tracking-wide transition-colors shadow-xs shrink-0 cursor-pointer"
                  id={`btn-select-cat-${item.serviceId}`}
                >
                  <span>Book Assist</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Track progress indicator bar */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div className="w-full max-w-[120px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F42F73] rounded-full transition-all duration-300"
            style={{ width: `${Math.max(15, scrollProgress)}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 font-medium">
          Swipe or scroll for more offers & services
        </span>
      </div>
    </section>
  );
};
