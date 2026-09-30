import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Zap,
  Flag,
  FileText,
  User,
  Calendar,
  Timer
} from 'lucide-react';
import { Booking } from '../../types';

interface NewOrderModalProps {
  order: Booking | null;
  onAccept: (orderId: string) => Promise<void> | void;
  onReject: (orderId: string) => Promise<void> | void;
  onExpire?: (orderId: string) => Promise<void> | void;
  isAccepting?: boolean;
  distanceText?: string;
}

export interface TripMatchedNotice {
  variant: 'DISAPPEARED_ACCEPTED_BY_OTHER' | 'CLICKED_ALREADY_ASSIGNED';
  title: string;
  message: string;
  bookingNumber?: string;
}

interface TripMatchedModalProps {
  notice: TripMatchedNotice | null;
  onClose: () => void;
}

export const TripMatchedModal: React.FC<TripMatchedModalProps> = ({ notice, onClose }) => {
  if (!notice) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="trip-matched-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#14213D] via-[#F42F73] to-emerald-500" />

        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
            Live Parallel Dispatch
          </div>
          <h3
            data-testid="trip-matched-title"
            className="text-xl font-black text-[#14213D] tracking-tight"
          >
            {notice.title}
          </h3>
          <p
            data-testid="trip-matched-message"
            className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed"
          >
            {notice.message}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-[11px] text-gray-500 font-medium">
          You remain <span className="font-bold text-emerald-600">ONLINE & AVAILABLE</span> and will receive the next nearby trip request automatically.
        </div>

        <button
          type="button"
          data-testid="trip-matched-ok-btn"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] active:scale-[0.99] text-white font-black text-sm transition-all shadow-md cursor-pointer min-h-[48px]"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  order,
  onAccept,
  onReject,
  onExpire,
  isAccepting = false,
  distanceText
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(15);

  useEffect(() => {
    if (!order) return;

    const computeRemaining = (): number => {
      const expiresAtMs =
        order.requestExpiresAtMs ||
        (order.requestExpiresAt ? new Date(order.requestExpiresAt).getTime() : 0);
      if (expiresAtMs > 0) {
        const diffSec = Math.ceil((expiresAtMs - Date.now()) / 1000);
        return Math.max(0, Math.min(15, diffSec));
      }
      const sentAtMs =
        order.requestSentAtMs ||
        (order.requestSentAt ? new Date(order.requestSentAt).getTime() : 0) ||
        (order.createdAt ? new Date(order.createdAt).getTime() : 0);
      if (sentAtMs > 0) {
        const diffSec = Math.ceil((sentAtMs + 15000 - Date.now()) / 1000);
        return Math.max(0, Math.min(15, diffSec));
      }
      return 15;
    };

    const initial = computeRemaining();
    setSecondsLeft(initial);

    if (initial <= 0 && !isAccepting) {
      if (onExpire) onExpire(order.id);
      return;
    }

    const timer = setInterval(() => {
      const rem = computeRemaining();
      setSecondsLeft(rem);
      if (rem <= 0 && !isAccepting) {
        clearInterval(timer);
        if (onExpire) {
          onExpire(order.id);
        }
      }
    }, 250);

    return () => clearInterval(timer);
  }, [
    order?.id,
    order?.requestExpiresAtMs,
    order?.requestExpiresAt,
    order?.requestSentAtMs,
    order?.requestSentAt,
    isAccepting,
    onExpire
  ]);

  if (!order) return null;

  const estimatedAmount = order.totalAmount || (order.hourlyRate || 149) * (order.totalHours || 2);
  const pickupAddress =
    order.pickupLocation?.address ||
    order.location?.address ||
    order.location?.area ||
    'Mumbai';
  const destinationAddress =
    order.destinationLocation?.address ||
    order.destinationLocation?.area ||
    'As per customer instructions';
  const requestDetails =
    order.instructions ||
    order.description ||
    'Standard assistance requested. Please coordinate upon arrival.';
  const resolvedDistance = order.estimatedDistance || distanceText || 'Nearby';
  const resolvedDuration = order.estimatedDuration || `${order.totalHours || 2} hrs`;
  const progressPercentage = Math.max(0, Math.min(100, (secondsLeft / 15) * 100));
  const isUrgent = secondsLeft <= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="incoming-trip-popup"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-emerald-500 space-y-4 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* 15-Second Live Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-500 to-[#F42F73]'
                : 'bg-gradient-to-r from-emerald-500 via-[#F42F73] to-emerald-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header: New Trip Request + 15-Second Countdown */}
        <div className="flex items-center justify-between pt-1.5 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Parallel Dispatch
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight flex items-center gap-1.5">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500 shrink-0" />
              <span>New Trip Request</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-gray-400">
              {order.bookingNumber || order.requestId || order.id}
            </span>
          </div>

          {/* 15-Second Server Countdown Badge */}
          <div
            data-testid="trip-request-countdown"
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 shrink-0 transition-all ${
              isUrgent
                ? 'bg-rose-50 border-rose-500 text-rose-600 animate-pulse'
                : 'bg-[#14213D] border-[#14213D] text-white'
            }`}
          >
            <div className="flex items-center gap-0.5 text-2xl font-mono font-black leading-none">
              <span>{secondsLeft}</span>
              <span className="text-xs font-bold">s</span>
            </div>
            <div
              className={`text-[9px] font-extrabold uppercase tracking-wider mt-0.5 flex items-center gap-0.5 ${
                isUrgent ? 'text-rose-600' : 'text-emerald-300'
              }`}
            >
              <Timer className="w-2.5 h-2.5" />
              <span>Expires</span>
            </div>
          </div>
        </div>

        {/* Primary Earnings, Distance & Estimated Trip Information Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Estimated Trip Earnings</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              ₹{estimatedAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-600 font-semibold">
              {order.totalHours || order.bookedHours || 2} hr{(order.totalHours || 2) > 1 ? 's' : ''} booked • ₹{order.hourlyRate || 149}/hr
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Distance</div>
            <div className="text-sm font-black text-[#14213D] flex items-center justify-end gap-1 mt-0.5">
              <Compass className="w-4 h-4 text-[#F42F73]" />
              <span>{resolvedDistance}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full mt-1 inline-block">
              Est. {resolvedDuration}
            </div>
          </div>
        </div>

        {/* Structured Trip Request Details */}
        <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
          {/* Service / Request Type */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Service / Request Type:
            </div>
            <div className="text-sm font-extrabold text-[#14213D] mt-0.5">{order.serviceName}</div>
          </div>

          {/* Customer Pickup / Location */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>Customer Pickup / Location:</span>
            </div>
            <div className="text-xs font-semibold text-[#14213D] mt-0.5 leading-snug">
              {pickupAddress}
            </div>
          </div>

          {/* Destination */}
          <div className="pb-2 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Flag className="w-3 h-3 text-indigo-600" />
              <span>Destination:</span>
            </div>
            <div className="text-xs font-semibold text-[#14213D] mt-0.5 leading-snug">
              {destinationAddress}
            </div>
          </div>

          {/* Customer & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-gray-200">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-[#F42F73]" />
                <span>Customer:</span>
              </div>
              <div className="text-xs font-extrabold text-[#14213D] mt-0.5">
                {order.customerName || 'Verified Customer'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#F42F73]" />
                <span>Schedule:</span>
              </div>
              <div className="text-xs font-bold text-[#14213D] mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>
                  {order.scheduledDate} • {order.startTime}
                </span>
              </div>
            </div>
          </div>

          {/* Estimated Trip Information / Instructions */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#F42F73]" />
              <span>Estimated Trip Information:</span>
            </div>
            <div className="text-xs font-medium text-gray-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-gray-200/80">
              {requestDetails}
            </div>
          </div>
        </div>

        {/* Two Prominent Action Buttons: DECLINE & ACCEPT */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            data-testid="decline-trip-btn"
            onClick={() => onReject(order.id)}
            disabled={isAccepting}
            className="py-3.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[52px] border border-gray-300 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-gray-500" />
            <span>DECLINE</span>
          </button>

          <button
            type="button"
            data-testid="accept-trip-btn"
            onClick={() => onAccept(order.id)}
            disabled={isAccepting || secondsLeft <= 0}
            className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[52px] shadow-lg shadow-emerald-600/30 disabled:opacity-60 cursor-pointer"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Locking Trip...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ACCEPT ({secondsLeft}s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

