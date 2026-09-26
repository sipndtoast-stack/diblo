import React, { useState } from 'react';
import {
  ShieldCheck,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  KeyRound,
  PlusCircle,
  FileText,
  Star,
  ArrowLeft,
  Navigation,
  Heart,
  Sparkles,
  Flag,
  Route as RouteIcon
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { AssistantTaskMap } from '../maps/AssistantTaskMap';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';
import { normalizeBookingStatus } from '../../lib/firestoreBookings';

interface ActiveBookingViewProps {
  onBack?: () => void;
  onOpenBooking?: () => void;
  onSelectTab?: (tab: any) => void;
}

export const ActiveBookingView: React.FC<ActiveBookingViewProps> = ({
  onBack,
  onOpenBooking,
  onSelectTab
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onSelectTab) {
      onSelectTab('HOME');
    }
  };
  const {
    activeBooking,
    liveEtaMinutes,
    liveDistanceKm,
    liveAssistantCoords,
    extendBooking,
    cancelBooking
  } = useBooking();
  const { toggleFavoriteAssistant, isAssistantFavorited } = useAuth();

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of schedule');
  const [isExtending, setIsExtending] = useState(false);

  if (!activeBooking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center mx-auto font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold text-[#14213D]">No Active Booking Selected</h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          You don’t have an active assistance request open right now. Book a Diblo assistant from the Home screen or select a booking from My Requests.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold"
          >
            Back to Home
          </button>
          {onOpenBooking && (
            <button
              onClick={onOpenBooking}
              className="px-6 py-3 rounded-xl bg-[#F42F73] text-white text-xs font-bold shadow-md"
            >
              Book New Assistant
            </button>
          )}
        </div>
      </div>
    );
  }

  const normStatus = normalizeBookingStatus(activeBooking.status);
  const isPending = normStatus === 'pending';
  const isAcceptedOrActive =
    normStatus === 'accepted' ||
    normStatus === 'on_the_way' ||
    normStatus === 'arrived' ||
    normStatus === 'in_progress';
  const isCompleted = normStatus === 'completed';
  const isCancelledOrRejected = normStatus === 'cancelled' || normStatus === 'rejected';

  // Format elapsed timer if IN_PROGRESS
  const elapsedSec = activeBooking.timerElapsedSeconds || 0;
  const hrs = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  const formattedTimer = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleExtendHour = async () => {
    setIsExtending(true);
    await extendBooking(activeBooking.id, 1);
    setIsExtending(false);
  };

  const handleConfirmCancel = async () => {
    await cancelBooking(activeBooking.id, cancelReason);
    setShowCancelModal(false);
  };

  const statusSteps = [
    { key: 'pending', label: 'Request Sent' },
    { key: 'accepted', label: 'Assistant Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }
  ];

  const getStepIndex = () => {
    if (normStatus === 'pending') return 0;
    if (normStatus === 'accepted' || normStatus === 'on_the_way' || normStatus === 'arrived') return 1;
    if (normStatus === 'in_progress') return 2;
    if (normStatus === 'completed') return 3;
    return 0;
  };
  const activeStepIdx = getStepIndex();

  // Real assistant GPS coordinates from Firebase (never simulated)
  const resolvedAssistantCoords =
    liveAssistantCoords ||
    (activeBooking.assistantLocation?.lat && activeBooking.assistantLocation?.lng
      ? { lat: activeBooking.assistantLocation.lat, lng: activeBooking.assistantLocation.lng }
      : null);

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Back & Booking ID Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#14213D] py-1.5 px-2.5 -ml-2.5 rounded-xl hover:bg-gray-100 transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-500">
            {activeBooking.bookingNumber || activeBooking.requestId || activeBooking.id}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : isCancelledOrRejected
                ? 'bg-red-100 text-red-700'
                : isAcceptedOrActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-[#FFF0F5] text-[#F42F73]'
            }`}
          >
            {isPending
              ? 'Finding an assistant'
              : normStatus === 'accepted'
              ? 'Assistant Assigned'
              : normStatus === 'in_progress'
              ? 'Assistance in Progress'
              : activeBooking.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* STATE 1: BOOKING REQUEST SENT (PENDING - WAITING FOR ASSISTANT)   */}
      {/* ================================================================= */}
      {isPending && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#14213D]">Booking Request Sent</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Status: Finding an assistant
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Your request has been sent to available assistants. This screen will update automatically in real time as soon as an assistant accepts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 font-semibold block">Request ID</span>
              <span className="font-mono font-bold text-[#14213D]">
                {activeBooking.bookingNumber || activeBooking.requestId || activeBooking.id}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Service</span>
              <span className="font-bold text-[#14213D]">{activeBooking.serviceName}</span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Date & Time</span>
              <span className="font-semibold text-[#14213D]">
                {activeBooking.scheduledDate} • {activeBooking.startTime}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block">Estimated Distance / Duration</span>
              <span className="font-semibold text-[#14213D]">
                {activeBooking.estimatedDistance || 'Within 2.5 km'} •{' '}
                {activeBooking.estimatedDuration || `${activeBooking.totalHours || 2} hrs`}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-400 font-semibold block">Pickup Location</span>
              <span className="font-semibold text-[#14213D]">{activeBooking.location?.address}</span>
            </div>
            {activeBooking.destinationLocation?.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-400 font-semibold block">Destination</span>
                <span className="font-semibold text-[#14213D]">
                  {activeBooking.destinationLocation.address}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STATE 2: ASSISTANT ASSIGNED & LIVE TRACKING BANNER                */}
      {/* ================================================================= */}
      {isAcceptedOrActive && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={
                activeBooking.assistantPhoto ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt={activeBooking.assistantName || 'Assistant'}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                {normStatus === 'in_progress' ? 'Assistance in Progress' : 'Assistant Assigned'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Your Assistant is on the way
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                <strong>{activeBooking.assistantName || 'Rajesh Sharma'}</strong> • {activeBooking.serviceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl border border-white/15 shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Live ETA</div>
              <div className="text-base font-black text-white">
                {liveEtaMinutes > 0
                  ? `${liveEtaMinutes} mins`
                  : activeBooking.estimatedDuration || 'Calculating...'}
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Distance</div>
              <div className="text-base font-black text-white">
                {liveDistanceKm > 0
                  ? `${liveDistanceKm} km`
                  : activeBooking.estimatedDistance || '2.4 km'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Google Map View (Pickup, Destination, Route & Real Assistant GPS Marker) */}
      {!isCompleted && !isCancelledOrRejected && (
        <AssistantTaskMap
          assistantLocation={
            resolvedAssistantCoords
              ? {
                  lat: resolvedAssistantCoords.lat,
                  lng: resolvedAssistantCoords.lng,
                  address: activeBooking.assistantLocation?.address || 'Live Assistant GPS',
                  area: activeBooking.location?.area || 'Mumbai'
                }
              : null
          }
          customerLocation={{
            lat: activeBooking.location?.lat || 19.0607,
            lng: activeBooking.location?.lng || 72.8258,
            address: activeBooking.location?.address || 'Mumbai',
            area: activeBooking.location?.area || 'Mumbai',
            landmark: activeBooking.location?.landmark
          }}
          destinationLocation={
            activeBooking.destinationLocation?.address
              ? {
                  lat: activeBooking.destinationLocation.lat || 19.055,
                  lng: activeBooking.destinationLocation.lng || 72.831,
                  address: activeBooking.destinationLocation.address,
                  area: activeBooking.destinationLocation.area || 'Mumbai'
                }
              : null
          }
          customerName={activeBooking.customerName || 'Customer'}
          assistantName={activeBooking.assistantName || 'Diblo Assistant'}
          bookingStatus={activeBooking.status}
          height="320px"
        />
      )}

      {/* Progress Stepper */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusSteps.map((step, i) => {
            const isDone = i <= activeStepIdx;
            const isCurrent = i === activeStepIdx;
            return (
              <div
                key={step.key}
                className={`p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-[#F42F73] bg-[#FFF0F5]'
                    : isDone
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Step {i + 1}
                  </span>
                  {isDone && (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#F42F73]' : 'text-emerald-600'}`}
                    />
                  )}
                </div>
                <div className="text-xs font-bold text-[#14213D]">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Assistant Profile + OTP & Live Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Assigned Assistant Profile Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-4">
            <img
              src={
                activeBooking.assistantPhoto ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt={activeBooking.assistantName || 'Assistant'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Police Verified
                </span>
                <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {activeBooking.assistantRating || 4.95}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-[#14213D] mt-1">
                {activeBooking.assistantName || (isPending ? 'Finding Assistant...' : 'Rajesh Sharma')}
              </h3>
              <p className="text-xs text-gray-500">
                {isPending
                  ? 'Broadcasting your request to verified assistants nearby'
                  : `Assigned for ${activeBooking.serviceName}`}
              </p>

              {activeBooking.assistantId && (
                <button
                  type="button"
                  onClick={() => toggleFavoriteAssistant(activeBooking.assistantId!)}
                  className={`mt-2.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                    isAssistantFavorited(activeBooking.assistantId)
                      ? 'bg-rose-50 text-[#F42F73] border-rose-200 shadow-2xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#F42F73]/40 hover:text-[#F42F73]'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      isAssistantFavorited(activeBooking.assistantId) ? 'fill-[#F42F73] text-[#F42F73]' : ''
                    }`}
                  />
                  <span>
                    {isAssistantFavorited(activeBooking.assistantId)
                      ? 'Saved as Preferred Helper'
                      : 'Save Helper to Favorites'}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase">Assistant Contact</div>
              <div className="text-xs font-mono font-bold text-[#14213D]">
                {activeBooking.assistantPhone ? `+91 ${activeBooking.assistantPhone}` : 'Assigned upon acceptance'}
              </div>
            </div>
            {activeBooking.assistantPhone && (
              <a
                href={`tel:${activeBooking.assistantPhone}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Assistant</span>
              </a>
            )}
          </div>
        </div>

        {/* Security Start OTP & Live Timer Card */}
        <div className="bg-[#14213D] text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col justify-between space-y-4">
          {normStatus !== 'in_progress' && !isCompleted ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#F42F73]" />
                  <span>Start Security OTP</span>
                </span>
                <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-gray-200">
                  Share on arrival
                </span>
              </div>

              <div className="py-2 text-center">
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-[0.3em] text-[#F42F73] bg-white/5 py-3 rounded-2xl border border-white/10">
                  {activeBooking.startOtp}
                </div>
                <p className="text-[11px] text-gray-300 mt-2">
                  Share this 4-digit code with your assistant once they reach your pickup location.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>{isCompleted ? 'Session Completed' : 'Assistance Session Live'}</span>
                </span>
                <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">
                  Booked: {activeBooking.totalHours || activeBooking.bookedHours} hrs
                </span>
              </div>

              <div className="py-2 text-center">
                <div className="text-3xl font-mono font-black tracking-widest text-white">
                  {isCompleted ? `${activeBooking.totalHours || activeBooking.bookedHours}:00:00` : formattedTimer}
                </div>
                <p className="text-[11px] text-gray-300 mt-1">
                  Billed transparently at ₹149/hour • Total: ₹{activeBooking.totalAmount}
                </p>
              </div>

              {normStatus === 'in_progress' && (
                <button
                  onClick={handleExtendHour}
                  disabled={isExtending}
                  className="w-full py-2.5 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isExtending ? 'Extending...' : 'Extend Booking by +1 Hour (₹149)'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Service & Pickup / Destination Summary Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase">Service Booked</div>
            <div className="text-base font-extrabold text-[#14213D]">{activeBooking.serviceName}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 font-bold uppercase">Total Fare</div>
            <div className="text-lg font-black text-[#F42F73]">₹{activeBooking.totalAmount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 pt-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#14213D]">Pickup Location:</span>{' '}
              {activeBooking.location?.address}
              {activeBooking.location?.landmark && ` (${activeBooking.location.landmark})`}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#F42F73] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#14213D]">Schedule:</span> {activeBooking.scheduledDate} at{' '}
              {activeBooking.startTime} ({activeBooking.totalHours || activeBooking.bookedHours} Hours)
            </div>
          </div>
          {activeBooking.destinationLocation?.address && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <Flag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#14213D]">Destination:</span>{' '}
                {activeBooking.destinationLocation.address}
              </div>
            </div>
          )}
        </div>

        {(activeBooking.instructions || activeBooking.description) && (
          <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 border border-gray-100">
            <span className="font-bold text-[#14213D]">Customer Instructions: </span>
            {activeBooking.instructions || activeBooking.description}
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-[#F42F73]" />
              <span>View GST Invoice</span>
            </button>

            {isCompleted && !activeBooking.rating && (
              <button
                id="active-view-rate-tip-btn"
                onClick={() => setShowRatingModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs min-h-[44px]"
              >
                <Star className="w-4 h-4 fill-gray-900" />
                <span>Rate Assistant & Leave Tip</span>
              </button>
            )}

            {activeBooking.rating && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>Rated {activeBooking.rating.stars}★</span>
                {activeBooking.tipAmount && activeBooking.tipAmount > 0 ? (
                  <span className="text-emerald-700 font-bold ml-1">
                    • ₹{activeBooking.tipAmount} Tip Given
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {!isCompleted && !isCancelledOrRejected && (
            <button
              id="active-view-cancel-booking-btn"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2 px-1 min-h-[44px] flex items-center"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#14213D]">Cancel Booking?</h3>
            <p className="text-xs text-gray-500">
              Please select a cancellation reason. Free cancellation is available before assistant arrival.
            </p>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
            >
              <option value="Change of schedule">Change of schedule</option>
              <option value="Errand no longer needed">Errand no longer needed</option>
              <option value="Booked wrong service or location">Booked wrong service or location</option>
              <option value="Assistant delayed">Assistant delayed</option>
            </select>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={activeBooking}
      />

      {/* Rating & Feedback Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        booking={activeBooking}
        bookingId={activeBooking.id}
        assistantName={activeBooking.assistantName || 'Rajesh Sharma'}
      />
    </div>
  );
};
