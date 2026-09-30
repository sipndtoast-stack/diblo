import React from 'react';
import {
  Lightbulb,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export interface ProTipItem {
  id: string;
  headline: string;
  detail: string;
  tag: string;
}

export interface CategoryProTipGroup {
  categoryKey: string;
  categoryLabel: string;
  summarySubtitle: string;
  accentClasses: {
    containerBg: string;
    containerBorder: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
    tagBg: string;
    tagText: string;
  };
  tips: ProTipItem[];
}

export interface ProTipsProps {
  category?: string;
  selectedCategory?: string;
  activeCategory?: string;
  serviceCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  onOpenBooking?: () => void;
}

export const CATEGORY_PRO_TIPS: Record<string, CategoryProTipGroup> = {
  ALL: {
    categoryKey: 'ALL',
    categoryLabel: 'All Mumbai Services',
    summarySubtitle: 'Smart booking guidance across all 13 Diblo urban assistance categories',
    accentClasses: {
      containerBg: 'from-[#FFF0F5]/90 via-white to-amber-50/40',
      containerBorder: 'border-[#F42F73]/25',
      iconBg: 'bg-[#F42F73]',
      iconText: 'text-white',
      badgeBg: 'bg-[#14213D]',
      badgeText: 'text-white',
      tagBg: 'bg-rose-50 border-rose-200/80',
      tagText: 'text-[#F42F73]'
    },
    tips: [
      {
        id: 'all-tip-hospital-early',
        headline: 'Book hospital assistants 2 hours early',
        detail:
          'Morning OPD token and diagnostic queues at major Mumbai hospitals fill up fast—scheduling at least 2 hours ahead ensures punctual arrival and queue placement.',
        tag: 'Timing Advice'
      },
      {
        id: 'all-tip-bundle-errands',
        headline: 'Combine nearby chores into one 2-hour slot (₹298)',
        detail:
          'Every booking includes a minimum 2-hour window at ₹149/hr. Group pharmacy pickups, grocery runs, and post/courier drops into a single session for maximum value.',
        tag: 'Value Saver'
      },
      {
        id: 'all-tip-start-otp',
        headline: 'Share your 4-digit Start OTP only at doorstep handoff',
        detail:
          'Your billing timer begins strictly when you verify the Start OTP with your police-verified assistant in person.',
        tag: 'Safety First'
      }
    ]
  },
  HEALTH_PHARMACY: {
    categoryKey: 'HEALTH_PHARMACY',
    categoryLabel: 'Hospital & Pharma',
    summarySubtitle: 'Contextual advice for hospital OPD escorts, diagnostics & pharmacy runs',
    accentClasses: {
      containerBg: 'from-sky-50/90 via-white to-emerald-50/40',
      containerBorder: 'border-sky-200/90',
      iconBg: 'bg-sky-600',
      iconText: 'text-white',
      badgeBg: 'bg-sky-700',
      badgeText: 'text-white',
      tagBg: 'bg-sky-50 border-sky-200',
      tagText: 'text-sky-700'
    },
    tips: [
      {
        id: 'health-tip-early',
        headline: 'Book hospital assistants 2 hours early',
        detail:
          'OPD registration and billing queues at Lilavati, Hinduja, Kokilaben, KEM, and Tata Memorial peak between 8:30 AM and 11:00 AM. Booking 2 hours early guarantees timely queue holding.',
        tag: 'Hospital OPD'
      },
      {
        id: 'health-tip-docs',
        headline: 'Keep OPD case papers, prescriptions & Aadhaar ready',
        detail:
          'Mention the hospital wing, gate number, and whether wheelchair escort is needed in your booking notes so your assistant arrives prepared at the exact entrance.',
        tag: 'Checklist'
      },
      {
        id: 'health-tip-pharma',
        headline: 'Request live photo verification for medicine pickups',
        detail:
          'For pharmacy errands, ask your assistant to send a quick photo of medicine strips, expiry dates, and the printed chemist bill before completing UPI payment.',
        tag: 'Pharmacy Tip'
      }
    ]
  },
  CARE_COMPANION: {
    categoryKey: 'CARE_COMPANION',
    categoryLabel: 'Elder & Care',
    summarySubtitle: 'Contextual advice for senior citizen walks, companionship & home support',
    accentClasses: {
      containerBg: 'from-amber-50/90 via-white to-orange-50/40',
      containerBorder: 'border-amber-200/90',
      iconBg: 'bg-amber-600',
      iconText: 'text-white',
      badgeBg: 'bg-amber-700',
      badgeText: 'text-white',
      tagBg: 'bg-amber-50 border-amber-200',
      tagText: 'text-amber-800'
    },
    tips: [
      {
        id: 'care-tip-pace',
        headline: 'Share walking pace, mobility aids & language preference',
        detail:
          'Let us know if your parent uses a walking stick or wheelchair and prefers Marathi, Gujarati, Hindi, or English so we match the most compatible companion.',
        tag: 'Senior Comfort'
      },
      {
        id: 'care-tip-contact',
        headline: 'Add a family member as secondary emergency contact',
        detail:
          'Working professionals booking care for aging parents can add their own mobile number to receive live GPS tracking and check-in updates throughout the session.',
        tag: 'Family Peace of Mind'
      },
      {
        id: 'care-tip-repeat',
        headline: 'Pin your parent’s favorite helper for recurring strolls',
        detail:
          'Seniors thrive on familiarity. Save trusted assistants to your Saved Helpers list for consistent evening walks at Carter Road, Juhu, or Shivaji Park.',
        tag: 'Continuity'
      }
    ]
  },
  DAILY_CHORES: {
    categoryKey: 'DAILY_CHORES',
    categoryLabel: 'Shopping & Errands',
    summarySubtitle: 'Contextual advice for market shopping, groceries & multi-stop city errands',
    accentClasses: {
      containerBg: 'from-emerald-50/90 via-white to-teal-50/40',
      containerBorder: 'border-emerald-200/90',
      iconBg: 'bg-emerald-600',
      iconText: 'text-white',
      badgeBg: 'bg-emerald-700',
      badgeText: 'text-white',
      tagBg: 'bg-emerald-50 border-emerald-200',
      tagText: 'text-emerald-800'
    },
    tips: [
      {
        id: 'chores-tip-list',
        headline: 'Provide an itemized shopping checklist with brand backups',
        detail:
          'Include preferred brands, exact quantities, and budget caps in your task notes so your assistant can breeze through Crawford Market, Linking Road, or D-Mart.',
        tag: 'Smart Shopping'
      },
      {
        id: 'chores-tip-offpeak',
        headline: 'Schedule multi-stop errands between 10:30 AM and 4:00 PM',
        detail:
          'Mid-day slots avoid peak Mumbai suburban traffic, letting your assistant complete 3–4 nearby errands (tailor, laundry, courier, groceries) within the 2-hour minimum.',
        tag: 'Route Efficiency'
      },
      {
        id: 'chores-tip-quality',
        headline: 'Ask for live video or photo checks on fresh produce',
        detail:
          'When sending an assistant to local fruit and vegetable mandis without you, request a quick photo check before weighing and billing.',
        tag: 'Quality Check'
      }
    ]
  },
  OFFICE_GOVT: {
    categoryKey: 'OFFICE_GOVT',
    categoryLabel: 'Office & Govt',
    summarySubtitle: 'Contextual advice for BMC ward offices, RTO, banking KYC & paperwork',
    accentClasses: {
      containerBg: 'from-indigo-50/90 via-white to-blue-50/40',
      containerBorder: 'border-indigo-200/90',
      iconBg: 'bg-indigo-600',
      iconText: 'text-white',
      badgeBg: 'bg-indigo-700',
      badgeText: 'text-white',
      tagBg: 'bg-indigo-50 border-indigo-200',
      tagText: 'text-indigo-800'
    },
    tips: [
      {
        id: 'office-tip-auth',
        headline: 'Prepare signed authorization letters & 2 photocopy sets',
        detail:
          'Government counters, RTOs, and banks in Fort, BKC, and Nariman Point often require a signed authority letter and self-attested ID copies for representative submissions.',
        tag: 'Documentation'
      },
      {
        id: 'office-tip-morning',
        headline: 'Book 9:30 AM arrival for government token windows',
        detail:
          'Most BMC ward offices and public sector bank counters issue limited physical tokens before the 1:00 PM lunch break—early arrival saves hours of waiting.',
        tag: 'Counter Timing'
      },
      {
        id: 'office-tip-receipt',
        headline: 'Collect stamped acknowledgment receipts before sign-off',
        detail:
          'Instruct your assistant to photograph the inward stamp or bank token receipt immediately upon counter submission for your records.',
        tag: 'Verification'
      }
    ]
  },
  SPECIAL: {
    categoryKey: 'SPECIAL',
    categoryLabel: 'Queues & Custom',
    summarySubtitle: 'Contextual advice for queue standing, temple darshan & society task supervision',
    accentClasses: {
      containerBg: 'from-purple-50/90 via-white to-fuchsia-50/40',
      containerBorder: 'border-purple-200/90',
      iconBg: 'bg-purple-600',
      iconText: 'text-white',
      badgeBg: 'bg-purple-700',
      badgeText: 'text-white',
      tagBg: 'bg-purple-50 border-purple-200',
      tagText: 'text-purple-800'
    },
    tips: [
      {
        id: 'special-tip-queue',
        headline: 'Schedule queue assistants 60–90 mins before gates open',
        detail:
          'For Siddhivinayak darshan queues, festive counters, or limited-seat admissions, early morning placement cuts total wait time in half.',
        tag: 'Queue Strategy'
      },
      {
        id: 'special-tip-handoff',
        headline: 'Coordinate a 15-minute live call before spot swap',
        detail:
          'Your assistant will share live position updates and call you 15 minutes before reaching the front counter so you can step in seamlessly.',
        tag: 'Smooth Handoff'
      },
      {
        id: 'special-tip-society',
        headline: 'Pre-approve society gate entry for home task supervision',
        detail:
          'When booking an assistant to supervise electricians, plumbers, or deep-cleaning crews while you are at work, approve their visitor pass on MyGate/NoBrokerHood in advance.',
        tag: 'Society Access'
      }
    ]
  },
  FAVORITES: {
    categoryKey: 'FAVORITES',
    categoryLabel: 'Saved Favorites',
    summarySubtitle: 'Contextual advice for getting the most out of your pinned services',
    accentClasses: {
      containerBg: 'from-rose-50/90 via-white to-pink-50/40',
      containerBorder: 'border-rose-200/90',
      iconBg: 'bg-[#F42F73]',
      iconText: 'text-white',
      badgeBg: 'bg-[#F42F73]',
      badgeText: 'text-white',
      tagBg: 'bg-rose-50 border-rose-200',
      tagText: 'text-[#F42F73]'
    },
    tips: [
      {
        id: 'fav-tip-hospital-early',
        headline: 'Book hospital assistants 2 hours early for pinned care visits',
        detail:
          'If Hospital Visit or Senior Citizen Assistance is in your favorites, booking 2 hours ahead secures your preferred assistant before peak morning hours.',
        tag: 'Priority Slot'
      },
      {
        id: 'fav-tip-pair-helper',
        headline: 'Pair pinned services with your Saved Helpers list',
        detail:
          'Combine your favorite service categories with a trusted assistant from your Saved Helpers for familiar, repeat assistance across Mumbai.',
        tag: 'Trusted Match'
      },
      {
        id: 'fav-tip-fast-rebook',
        headline: 'Use 1-tap selection for recurring weekly schedules',
        detail:
          'Pinned services stay at the top of your catalog even under All Services so you can rebook routine family errands in seconds.',
        tag: 'Quick Access'
      }
    ]
  }
};

export function resolveProTipsForCategory(rawCategory?: string): CategoryProTipGroup {
  if (!rawCategory) return CATEGORY_PRO_TIPS.ALL;
  const cleaned = rawCategory.trim();
  const upper = cleaned.toUpperCase();
  const lower = cleaned.toLowerCase();

  if (CATEGORY_PRO_TIPS[upper]) {
    return CATEGORY_PRO_TIPS[upper];
  }

  if (
    lower.includes('health') ||
    lower.includes('hospital') ||
    lower.includes('pharma') ||
    lower.includes('medical') ||
    lower.includes('doctor') ||
    lower.includes('clinic') ||
    lower.includes('medicine')
  ) {
    return CATEGORY_PRO_TIPS.HEALTH_PHARMACY;
  }

  if (
    lower.includes('care') ||
    lower.includes('companion') ||
    lower.includes('senior') ||
    lower.includes('elder') ||
    lower.includes('parent')
  ) {
    return CATEGORY_PRO_TIPS.CARE_COMPANION;
  }

  if (
    lower.includes('chore') ||
    lower.includes('shop') ||
    lower.includes('errand') ||
    lower.includes('market') ||
    lower.includes('grocery') ||
    lower.includes('daily')
  ) {
    return CATEGORY_PRO_TIPS.DAILY_CHORES;
  }

  if (
    lower.includes('office') ||
    lower.includes('govt') ||
    lower.includes('government') ||
    lower.includes('bank') ||
    lower.includes('document') ||
    lower.includes('paperwork') ||
    lower.includes('bmc') ||
    lower.includes('rto')
  ) {
    return CATEGORY_PRO_TIPS.OFFICE_GOVT;
  }

  if (
    lower.includes('special') ||
    lower.includes('queue') ||
    lower.includes('custom') ||
    lower.includes('local') ||
    lower.includes('darshan') ||
    lower.includes('temple')
  ) {
    return CATEGORY_PRO_TIPS.SPECIAL;
  }

  if (lower.includes('fav') || lower.includes('saved') || lower.includes('pin')) {
    return CATEGORY_PRO_TIPS.FAVORITES;
  }

  return {
    ...CATEGORY_PRO_TIPS.ALL,
    categoryKey: cleaned,
    categoryLabel: cleaned,
    summarySubtitle: `Contextual booking advice for ${cleaned} assistance services`
  };
}

export const ProTips: React.FC<ProTipsProps> = ({
  category,
  selectedCategory,
  activeCategory,
  serviceCategory,
  onOpenBooking
}) => {
  const resolvedCategoryKey =
    selectedCategory || activeCategory || category || serviceCategory || 'ALL';
  const group = resolveProTipsForCategory(resolvedCategoryKey);
  const { accentClasses } = group;

  return (
    <div
      data-testid="pro-tips-section"
      aria-label="Pro-tips"
      className={`mt-4 mb-2 rounded-3xl bg-gradient-to-r ${accentClasses.containerBg} border ${accentClasses.containerBorder} p-4 sm:p-5 shadow-2xs transition-all duration-200`}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-200/60">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl ${accentClasses.iconBg} ${accentClasses.iconText} flex items-center justify-center shrink-0 shadow-xs`}
          >
            <Lightbulb className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                data-testid="pro-tips-heading"
                className="text-sm sm:text-base font-extrabold text-[#14213D] tracking-tight"
              >
                Pro-tips
              </h3>
              <span
                data-testid="pro-tips-active-category"
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${accentClasses.badgeBg} ${accentClasses.badgeText}`}
              >
                {group.categoryLabel}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{group.summarySubtitle}</p>
          </div>
        </div>

        {onOpenBooking && (
          <button
            type="button"
            onClick={onOpenBooking}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#14213D] hover:text-[#F42F73] bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Schedule Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Contextual Advice Cards */}
      <div
        data-testid="pro-tips-list"
        className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3.5"
      >
        {group.tips.map((tip, index) => (
          <div
            key={tip.id}
            data-testid={`pro-tip-item-${index}`}
            className="bg-white/95 rounded-2xl p-3.5 border border-gray-100 shadow-2xs flex flex-col justify-between gap-2"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${accentClasses.tagBg} ${accentClasses.tagText}`}
                >
                  {tip.tag}
                </span>
                {index === 0 ? (
                  <Clock className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                ) : index === 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-[#14213D] leading-snug">
                {tip.headline}
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
                {tip.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProTips;
