import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  X,
  Check,
  Heart,
  Gift,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ThumbsUp,
  CreditCard,
  Smartphone,
  Wallet,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBooking } from '../../context/BookingContext';
import { Booking } from '../../types';

export interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  booking?: Booking | null;
  assistantName?: string;
  assistantPhoto?: string;
  serviceName?: string;
  bookingNumber?: string;
}

const PRESET_TIPS = [
  { amount: 0, label: 'No Tip', icon: '' },
  { amount: 30, label: '₹30', subtitle: 'Chai ☕' },
  { amount: 50, label: '₹50', subtitle: 'Snack 🥪', recommended: true },
  { amount: 100, label: '₹100', subtitle: 'Appreciation ⭐' },
  { amount: 200, label: '₹200', subtitle: 'Superstar 🚀' }
];

const COMPLIMENT_TAGS = [
  'Punctual & On-Time',
  'Polite & Respectful',
  'Careful with Seniors',
  'Handled Paperwork Well',
  'Clear Communication',
  'Trustworthy & Honest',
  'Fast & Efficient',
  'Compassionate & Patient'
];

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  bookingId: propBookingId,
  booking: propBooking,
  assistantName: propAssistantName,
  assistantPhoto: propAssistantPhoto,
  serviceName: propServiceName,
  bookingNumber: propBookingNumber
}) => {
  const { bookings, rateBooking } = useBooking();

  // Resolve target booking
  const targetBooking =
    propBooking ||
    (propBookingId ? bookings.find((b) => b.id === propBookingId) : null);

  const effectiveBookingId = targetBooking?.id || propBookingId || '';
  const effectiveAssistantName =
    targetBooking?.assistantName || propAssistantName || 'Assigned Assistant';
  const effectiveAssistantPhoto =
    targetBooking?.assistantPhoto ||
    propAssistantPhoto ||
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80';
  const effectiveServiceName =
    targetBooking?.serviceName || propServiceName || 'Assistance Service';
  const effectiveBookingNumber =
    targetBooking?.bookingNumber || propBookingNumber || '';

  // Form State
  const [stars, setStars] = useState<number>(5);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Punctual & On-Time',
    'Polite & Respectful'
  ]);

  // Tip State
  const [selectedTip, setSelectedTip] = useState<number>(50);
  const [customTip, setCustomTip] = useState<string>('');
  const [isCustomTipActive, setIsCustomTipActive] = useState<boolean>(false);
  const [tipPaymentMethod, setTipPaymentMethod] = useState<'UPI' | 'CARD' | 'WALLET'>('UPI');

  // Submission & Success state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset when opening a new booking
  useEffect(() => {
    if (isOpen) {
      setStars(5);
      setHoveredStar(null);
      setComment('');
      setSelectedTags(['Punctual & On-Time', 'Polite & Respectful']);
      setSelectedTip(50);
      setCustomTip('');
      setIsCustomTipActive(false);
      setIsSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, effectiveBookingId]);

  if (!isOpen) return null;

  const currentTipAmount = isCustomTipActive
    ? Math.max(0, parseInt(customTip, 10) || 0)
    : selectedTip;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectPresetTip = (amount: number) => {
    setIsCustomTipActive(false);
    setSelectedTip(amount);
  };

  const handleCustomTipChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setCustomTip(cleaned);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmit = async () => {
    if (!effectiveBookingId) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await rateBooking(
        effectiveBookingId,
        stars,
        comment.trim() ? comment.trim() : undefined,
        selectedTags,
        currentTipAmount,
        currentTipAmount > 0 ? tipPaymentMethod : undefined
      );

      triggerCelebration();
      setIsSuccess(true);

      setTimeout(() => {
        onClose();
      }, 2400);
    } catch (err) {
      console.error('Failed to submit rating & tip', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStarCount = hoveredStar !== null ? hoveredStar : stars;

  return (
    <AnimatePresence>
      <div
        id="post-booking-feedback-backdrop"
        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <motion.div
          id="post-booking-feedback-modal"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 text-[#14213D] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Modal Header */}
          <div
            id="feedback-modal-header"
            className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#FFF5F8] to-white"
          >
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#FFF0F5] text-[#F42F73]">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#F42F73]">
                  Booking Completed
                </span>
                <h2 className="text-base sm:text-lg font-black text-[#14213D] leading-tight">
                  Rate & Tip Your Assistant
                </h2>
              </div>
            </div>

            <button
              id="feedback-modal-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close feedback modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {isSuccess ? (
              /* Success Appreciation View */
              <div
                id="feedback-success-card"
                className="py-10 text-center space-y-4 animate-in fade-in zoom-in duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-[#14213D]">Thank You!</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Your {stars}★ feedback{' '}
                    {currentTipAmount > 0
                      ? `and ₹${currentTipAmount} tip have been sent to ${effectiveAssistantName}.`
                      : `has been recorded for ${effectiveAssistantName}.`}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 max-w-sm mx-auto text-xs text-amber-900 font-medium">
                  🌟 You rated <strong>{stars} out of 5 stars</strong>
                  {currentTipAmount > 0 && (
                    <span className="block mt-1 text-emerald-700 font-bold">
                      Tip: ₹{currentTipAmount} ({tipPaymentMethod})
                    </span>
                  )}
                </div>

                <button
                  id="feedback-success-done-btn"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#14213D] text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Rating & Tip Form */
              <>
                {/* Assistant Info Banner */}
                <div
                  id="feedback-assistant-banner"
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100"
                >
                  <img
                    src={effectiveAssistantPhoto}
                    alt={effectiveAssistantName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-[#14213D] truncate">
                        {effectiveAssistantName}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {effectiveServiceName}
                      {effectiveBookingNumber ? ` • ${effectiveBookingNumber}` : ''}
                    </p>
                  </div>
                </div>

                {/* Section 1: Star Rating */}
                <div id="feedback-stars-section" className="text-center space-y-2.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    How was your experience?
                  </span>

                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        id={`star-btn-${s}`}
                        type="button"
                        onClick={() => setStars(s)}
                        onMouseEnter={() => setHoveredStar(s)}
                        onMouseLeave={() => setHoveredStar(null)}
                        className="p-1.5 transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                        aria-label={`Rate ${s} stars`}
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                            s <= activeStarCount
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'fill-gray-100 text-gray-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Rating Label */}
                  <div className="text-xs font-bold transition-all">
                    {activeStarCount === 5 && (
                      <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                        🌟 Outstanding • Exceeded Expectations!
                      </span>
                    )}
                    {activeStarCount === 4 && (
                      <span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-full inline-block">
                        👍 Great • Very Helpful & Friendly
                      </span>
                    )}
                    {activeStarCount === 3 && (
                      <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block">
                        👌 Good • Met All Requirements
                      </span>
                    )}
                    {activeStarCount === 2 && (
                      <span className="text-orange-700 bg-orange-50 px-3 py-1 rounded-full inline-block">
                        😐 Fair • Room for Improvement
                      </span>
                    )}
                    {activeStarCount === 1 && (
                      <span className="text-red-700 bg-red-50 px-3 py-1 rounded-full inline-block">
                        ⚠️ Needs Improvement
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 2: Compliment Chips */}
                <div id="feedback-tags-section" className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    What stood out the most?
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPLIMENT_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          id={`tag-chip-${tag.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[32px] flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#FFF0F5] text-[#F42F73] border border-[#F42F73] font-bold shadow-2xs'
                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Optional Comment */}
                <div id="feedback-comment-section">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Add a comment or note of appreciation (optional)
                  </label>
                  <textarea
                    id="feedback-comment-textarea"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="e.g. Rajesh was patient, polite, and handled everything smoothly."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] placeholder-gray-400 focus:outline-none focus:border-[#F42F73] transition-colors resize-none"
                  />
                </div>

                {/* Section 4: TIP ASSISTANT (Key Feature) */}
                <div
                  id="feedback-tipping-container"
                  className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-pink-50/60 via-[#FFF8FA] to-white border border-[#F42F73]/20 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#F42F73] text-white">
                        <Heart className="w-4 h-4 fill-white" />
                      </span>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#14213D]">
                          Tip {effectiveAssistantName}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium">
                          100% of your tip goes directly to your assistant
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preset Tip Pills */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {PRESET_TIPS.map((preset) => {
                      const isSelected = !isCustomTipActive && selectedTip === preset.amount;
                      return (
                        <button
                          key={preset.amount}
                          id={`tip-preset-${preset.amount}`}
                          type="button"
                          onClick={() => handleSelectPresetTip(preset.amount)}
                          className={`relative py-2.5 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center min-h-[50px] ${
                            isSelected
                              ? 'bg-[#F42F73] text-white font-bold shadow-md shadow-[#F42F73]/25 scale-[1.02]'
                              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 font-semibold'
                          }`}
                        >
                          {preset.recommended && !isSelected && (
                            <span className="absolute -top-1.5 right-0.5 px-1 bg-amber-400 text-gray-900 text-[8px] font-black rounded-full uppercase">
                              Popular
                            </span>
                          )}
                          <span className="text-xs font-bold">{preset.label}</span>
                          {preset.subtitle && (
                            <span
                              className={`text-[9px] mt-0.5 truncate max-w-full ${
                                isSelected ? 'text-pink-100 font-medium' : 'text-gray-400'
                              }`}
                            >
                              {preset.subtitle}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Tip Input Toggle */}
                  <div className="pt-1">
                    {!isCustomTipActive ? (
                      <button
                        id="tip-custom-toggle-btn"
                        type="button"
                        onClick={() => {
                          setIsCustomTipActive(true);
                          setCustomTip('75');
                        }}
                        className="text-xs text-[#F42F73] font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Enter custom tip amount...</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#F42F73]">
                        <span className="text-xs font-bold text-gray-500 pl-1">₹</span>
                        <input
                          id="tip-custom-amount-input"
                          type="text"
                          inputMode="numeric"
                          value={customTip}
                          onChange={(e) => handleCustomTipChange(e.target.value)}
                          placeholder="Amount"
                          className="flex-1 text-xs font-bold text-[#14213D] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomTipActive(false);
                            setSelectedTip(50);
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md bg-gray-100 font-bold"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tip Payment Method (Only visible if tip > 0) */}
                  {currentTipAmount > 0 && (
                    <div className="pt-2 border-t border-pink-100/80 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                        <span>Pay Tip via</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Instant Transfer
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'UPI', label: 'UPI / GPay', icon: Smartphone },
                          { id: 'CARD', label: 'Card', icon: CreditCard },
                          { id: 'WALLET', label: 'Wallet', icon: Wallet }
                        ].map((m) => (
                          <button
                            key={m.id}
                            id={`tip-method-${m.id.toLowerCase()}`}
                            type="button"
                            onClick={() => setTipPaymentMethod(m.id as any)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                              tipPaymentMethod === m.id
                                ? 'bg-white text-[#14213D] border border-gray-300 shadow-2xs font-black'
                                : 'bg-pink-50/40 text-gray-500 hover:bg-white border border-transparent'
                            }`}
                          >
                            <m.icon className="w-3 h-3 text-[#F42F73]" />
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Modal Footer CTA */}
          {!isSuccess && (
            <div
              id="feedback-modal-footer"
              className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <button
                id="feedback-skip-btn"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 order-2 sm:order-1 py-2 px-3"
              >
                Skip for now
              </button>

              <button
                id="feedback-submit-btn"
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 order-1 sm:order-2 transition-all min-h-[44px]"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {currentTipAmount > 0
                        ? `Submit Rating & Tip ₹${currentTipAmount}`
                        : 'Submit Rating & Feedback'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default RatingModal;
