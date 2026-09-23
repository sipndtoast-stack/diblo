import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Zap
} from 'lucide-react';
import { Booking } from '../../types';

interface NewOrderModalProps {
  order: Booking | null;
  onAccept: (orderId: string) => Promise<void> | void;
  onReject: (orderId: string) => Promise<void> | void;
  isAccepting?: boolean;
  distanceText?: string;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  order,
  onAccept,
  onReject,
  isAccepting = false,
  distanceText = '1.8 km'
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);

  useEffect(() => {
    if (!order) return;
    setSecondsRemaining(45);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject(order.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.id, onReject]);

  if (!order) return null;

  const estimatedAmount = order.totalAmount || (order.hourlyRate || 149) * (order.totalHours || 2);
  const locationAddress = order.location.address || 'Service Location, Mumbai';
  const locationArea = order.location.area || 'Mumbai West';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-emerald-500 space-y-5 relative overflow-hidden">
        {/* Animated Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-[#F42F73] to-emerald-500 animate-pulse" />

        {/* Header: Title & Countdown */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block" />
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight flex items-center gap-1.5">
              <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
              <span>NEW ORDER</span>
            </h2>
          </div>

          <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{secondsRemaining}s</span>
          </div>
        </div>

        {/* Primary Service & Amount Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Estimated Earnings</span>
            </div>
            <div className="text-3xl font-black text-emerald-600 mt-0.5">
              ₹{estimatedAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Fixed payout for {order.totalHours || 2} hr{(order.totalHours || 2) > 1 ? 's' : ''} service
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Distance</div>
            <div className="text-base font-black text-[#14213D] flex items-center justify-end gap-1 mt-0.5">
              <Compass className="w-4 h-4 text-[#F42F73]" />
              <span>{distanceText}</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full mt-1 inline-block">
              ~7 min away
            </div>
          </div>
        </div>

        {/* Order Essential Information */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          {/* Customer */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Name</div>
            <div className="text-base font-bold text-[#14213D] mt-0.5">
              {order.customerName || 'Customer'}
            </div>
          </div>

          {/* Service / Destination */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Required</div>
            <div className="text-sm font-extrabold text-[#14213D] mt-0.5">
              {order.serviceName}
            </div>
          </div>

          {/* Pickup Location */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Pickup Location</span>
            </div>
            <div className="text-xs font-semibold text-[#14213D] mt-0.5 leading-snug">
              {locationAddress}
            </div>
            {locationArea && (
              <div className="text-[11px] text-gray-500 font-medium">
                Area: {locationArea}
              </div>
            )}
          </div>
        </div>

        {/* Two Large Action Buttons: ACCEPT & REJECT */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onReject(order.id)}
            disabled={isAccepting}
            className="py-4 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all min-h-[54px] border border-gray-300 shadow-2xs disabled:opacity-50"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
            <span>REJECT</span>
          </button>

          <button
            type="button"
            onClick={() => onAccept(order.id)}
            disabled={isAccepting}
            className="py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all min-h-[54px] shadow-lg shadow-emerald-600/30 disabled:opacity-80"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>ACCEPTING...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>ACCEPT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
