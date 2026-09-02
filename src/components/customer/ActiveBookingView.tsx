import React, { useState } from 'react';
import {
  ShieldCheck,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Star,
  FileText,
  Navigation,
  Loader2,
  ChevronRight,
  X
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { MapView } from '../common/MapView';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';
import { Booking } from '../../types';

interface ActiveBookingViewProps {
  onOpenBooking: () => void;
  onSelectTab: (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT') => void;
}

export const ActiveBookingView: React.FC<ActiveBookingViewProps> = ({ onOpenBooking, onSelectTab }) => {
  const {
    activeBooking,
    liveEtaMinutes,
    liveDistanceKm,
    liveAssistantCoords,
    extendBooking,
    cancelBooking,
    completeBooking
  } = useBooking();

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of schedule');
  const [isExtending, setIsExtending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([
    'Hello! I am on my way to your location in Bandra.',
    'I have arrived at the society gate. Standing near Tower B.'
  ]);
  const [newMsg, setNewMsg] = useState('');

  if (!activeBooking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-[#FFF0F5] rounded-full flex items-center justify-center mx-auto text-[#F42F73]">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#14213D]">No Active Booking in Progress</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Book a verified Diblo assistant right now for your errands, hospital visits, or senior assistance.
          </p>
        </div>
        <button
          onClick={onOpenBooking}
          className="px-6 py-3 rounded-2xl bg-[#F42F73] text-white font-bold text-xs shadow-lg shadow-[#F42F73]/20"
        >
          Book an Assistant @ ₹149/hr
        </button>
      </div>
    );
  }

  // Format Elapsed Timer (seconds to HH:MM:SS)
  const formatTimer = (totalSeconds: number = 0) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendChat = () => {
    if (!newMsg.trim()) return;
    setChatMessages((prev) => [...prev, newMsg]);
    setNewMsg('');
  };

  const handleExtend = async (hours: number) => {
    setIsExtending(true);
    try {
      await extendBooking(activeBooking.id, hours);
    } finally {
      setIsExtending(false);
    }
  };

  const handleConfirmCancel = async () => {
    await cancelBooking(activeBooking.id, cancelReason);
    setShowCancelModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Top Status Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Booking {activeBooking.bookingNumber}
            </span>
            <span className="bg-[#FFF0F5] text-[#F42F73] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
              {activeBooking.status.replace('_', ' ')}
            </span>
          </div>
          <h2 className="text-xl font-black text-[#14213D] mt-1">{activeBooking.serviceName}</h2>
          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>{activeBooking.location.address} ({activeBooking.location.area})</span>
          </div>
        </div>

        {/* Live OTP Box */}
        {(activeBooking.status === 'ASSIGNED' ||
          activeBooking.status === 'ACCEPTED' ||
          activeBooking.status === 'ON_THE_WAY' ||
          activeBooking.status === 'ARRIVED') && (
          <div className="bg-[#FFF0F5] border border-[#F42F73]/30 p-3.5 rounded-2xl text-center shrink-0">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Task OTP</div>
            <div className="text-2xl font-black text-[#F42F73] font-mono tracking-widest mt-0.5">
              {activeBooking.startOtp || '5829'}
            </div>
            <div className="text-[10px] text-gray-500">Share with assistant upon arrival</div>
          </div>
        )}

        {/* In-Progress Live Timer */}
        {activeBooking.status === 'IN_PROGRESS' && (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-center shrink-0">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Task In Progress</div>
            <div className="text-2xl font-black text-emerald-600 font-mono tracking-widest mt-0.5">
              {formatTimer(activeBooking.timerElapsedSeconds || 320)}
            </div>
            <div className="text-[10px] text-emerald-700">Booked for {activeBooking.totalHours} hrs</div>
          </div>
        )}
      </div>

      {/* Live Map Tracking View */}
      {(activeBooking.status === 'ON_THE_WAY' || activeBooking.status === 'ARRIVED' || activeBooking.status === 'IN_PROGRESS') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#14213D] flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Live Assistant Route Map</span>
            </span>
            <span className="text-gray-500 font-medium">GPS Tracking Active</span>
          </div>
          <MapView
            assistantLocation={liveAssistantCoords}
            customerLocation={{ lat: activeBooking.location.lat, lng: activeBooking.location.lng }}
            height="340px"
            etaMinutes={activeBooking.status === 'ON_THE_WAY' ? liveEtaMinutes : 0}
            distanceKm={activeBooking.status === 'ON_THE_WAY' ? liveDistanceKm : 0}
          />
        </div>
      )}

      {/* Assigned Assistant Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Diblo Assistant</div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={
                activeBooking.assistantPhoto ||
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
              }
              alt="Assistant"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-[#14213D]">{activeBooking.assistantName || 'Rajesh Sharma'}</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                +91 {activeBooking.assistantPhone || '9820554433'} • 4.9★ (320+ tasks completed)
              </div>
              <div className="text-[11px] text-[#F42F73] font-semibold mt-1">
                Badge ID: DIBLO-MUM-{activeBooking.assistantId?.slice(-4).toUpperCase() || '7721'}
              </div>
            </div>
          </div>

          {/* Quick Communication Actions */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${activeBooking.assistantPhone || '9820554433'}`}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-4 h-4 text-[#F42F73]" />
              <span>Call</span>
            </a>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-2.5 rounded-xl bg-[#FFF0F5] hover:bg-[#F42F73] hover:text-white text-[#F42F73] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>
          </div>
        </div>

        {/* Expandable In-App Chat Drawer */}
        {chatOpen && (
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
            <div className="text-xs font-bold text-gray-600">Quick Assistant Chat</div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-xs bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                  {msg}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
              />
              <button
                onClick={handleSendChat}
                className="px-4 py-2 rounded-xl bg-[#14213D] text-white text-xs font-bold"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-Progress Extension & Controls */}
      {activeBooking.status === 'IN_PROGRESS' && (
        <div className="bg-[#FFF0F5]/80 border border-[#F42F73]/20 rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#14213D]">Need More Time?</h4>
              <p className="text-xs text-gray-500">Extend your ongoing booking seamlessly at flat ₹149/hr.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => handleExtend(1)}
              disabled={isExtending}
              className="px-4 py-2 rounded-xl bg-white border border-[#F42F73] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add +1 Hour (₹149)</span>
            </button>
            <button
              onClick={() => handleExtend(2)}
              disabled={isExtending}
              className="px-4 py-2 rounded-xl bg-white border border-[#F42F73] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add +2 Hours (₹298)</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons: Invoice, Rating, Complete, Cancel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {activeBooking.invoiceNumber && (
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#14213D] text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-[#F42F73]" />
              <span>View Tax Invoice</span>
            </button>
          )}

          {activeBooking.status === 'COMPLETED' && !activeBooking.rating && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Star className="w-4 h-4 fill-gray-900" />
              <span>Rate Assistant</span>
            </button>
          )}
        </div>

        {activeBooking.status !== 'COMPLETED' && activeBooking.status !== 'CANCELLED' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            Cancel Booking
          </button>
        )}
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
        bookingId={activeBooking.id}
        assistantName={activeBooking.assistantName || 'Rajesh Sharma'}
      />
    </div>
  );
};
