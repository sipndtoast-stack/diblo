import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { SERVICES, MOCK_ASSISTANTS } from '../../data/mockData';
import { ServiceItem } from '../../types';
import { IconHelper } from '../common/IconHelper';

interface CustomerHomeProps {
  onSelectService: (service: ServiceItem) => void;
  onOpenBooking: () => void;
  onOpenLegal: (page: string) => void;
  onSelectTab: (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT') => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  onSelectService,
  onOpenBooking,
  onOpenLegal,
  onSelectTab
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  const categories = [
    { id: 'ALL', label: 'All 13 Services' },
    { id: 'CARE_COMPANION', label: 'Elder & Care' },
    { id: 'DAILY_CHORES', label: 'Shopping & Errands' },
    { id: 'HEALTH_PHARMACY', label: 'Hospital & Pharma' },
    { id: 'OFFICE_GOVT', label: 'Office & Govt' },
    { id: 'SPECIAL', label: 'Queues & Custom' }
  ];

  const filteredServices =
    selectedCategory === 'ALL'
      ? SERVICES
      : SERVICES.filter((s) => s.category === selectedCategory);

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
    <div className="min-h-screen bg-[#fcfcfc] text-[#14213D] pb-24 md:pb-16 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF0F5]/80 via-white to-[#fcfcfc] pt-6 pb-10 sm:pt-12 sm:pb-16 border-b border-gray-100">
        <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-3.5 sm:px-4 py-1.5 rounded-full shadow-xs border border-[#F42F73]/20">
              <span className="w-2 h-2 rounded-full bg-[#F42F73] animate-pulse shrink-0" />
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

        {/* 13 Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6 pt-3 sm:pt-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 hover:border-[#F42F73] shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-pink-100/70 text-[#F42F73] flex items-center justify-center text-xl mb-1 group-hover:bg-[#F42F73] group-hover:text-white transition-colors shadow-xs shrink-0">
                    <IconHelper name={service.icon} className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fixed Rate</div>
                    <div className="text-base font-black text-[#F42F73]">₹{service.baseHourlyRate}/hr</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#14213D] group-hover:text-[#F42F73] transition-colors">
                      {service.title}
                    </h3>
                    {service.popular && (
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
          ))}
        </div>
      </section>

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
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Verified Mumbai Assistants</div>
              <div className="space-y-2.5">
                {MOCK_ASSISTANTS.slice(0, 3).map((asst) => (
                  <div key={asst.id} className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={asst.photo} alt={asst.name} className="w-11 h-11 rounded-full object-cover border border-white/20 shrink-0" />
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                          <span>{asst.name}</span>
                          <span className="bg-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">✓ Verified</span>
                        </div>
                        <div className="text-[11px] text-gray-300">{asst.serviceArea.slice(0, 2).join(', ')} • {asst.completedTasksCount}+ tasks</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                        <span>{asst.rating}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">₹149/hr</div>
                    </div>
                  </div>
                ))}
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
              name: 'Aarav Mehta',
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
