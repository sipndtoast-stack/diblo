import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { Booking } from '../../types';
import { Calendar, Clock, MapPin, Star, FileText, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { InvoiceModal } from '../common/InvoiceModal';
import { RatingModal } from './RatingModal';

interface CustomerBookingsProps {
  onSelectBooking: (booking: Booking) => void;
  onOpenBooking: () => void;
}

export const CustomerBookings: React.FC<CustomerBookingsProps> = ({ onSelectBooking, onOpenBooking }) => {
  const { bookings } = useBooking();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);

  const customerBookings = bookings.filter((b) => b.customerId === 'cust-1' || !b.customerId);

  const filtered = customerBookings.filter((b) => {
    if (filter === 'ACTIVE') return b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
    if (filter === 'COMPLETED') return b.status === 'COMPLETED';
    if (filter === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">My Assistance Bookings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track active errands and view past assistance receipts</p>
        </div>
        <button
          onClick={onOpenBooking}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F42F73] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 hover:bg-[#D81B60] transition-colors min-h-[44px] flex items-center justify-center"
        >
          Book New Assistant @ ₹149/hr
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-semibold max-w-md overflow-x-auto scrollbar-none">
        {[
          { id: 'ALL', label: 'All Bookings' },
          { id: 'ACTIVE', label: 'Active / Live' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'CANCELLED', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all whitespace-nowrap min-h-[38px] flex items-center justify-center ${
              filter === tab.id ? 'bg-white text-[#F42F73] font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 space-y-3">
            <div className="text-gray-400 text-3xl">📋</div>
            <div className="text-sm font-bold text-gray-700">No bookings in this section</div>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Book your first Diblo assistant for your hospital visit, queue standing, or senior care.
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const isActive = b.status !== 'COMPLETED' && b.status !== 'CANCELLED';
            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 font-mono">{b.bookingNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#FFF0F5] text-[#F42F73]'
                        }`}
                      >
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#14213D] mt-0.5">{b.serviceName}</h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs font-bold text-gray-400">Total Paid</div>
                    <div className="text-lg font-black text-[#F42F73]">₹{b.totalAmount}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{b.scheduledDate} at {b.startTime} ({b.totalHours} hrs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{b.location.area}, Mumbai</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Assistant: <strong>{b.assistantName || 'Assigned Partner'}</strong></span>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {b.invoiceNumber && (
                      <button
                        onClick={() => setSelectedInvoiceBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-colors min-h-[40px]"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#F42F73]" />
                        <span>Tax Invoice</span>
                      </button>
                    )}

                    {b.status === 'COMPLETED' && !b.rating && (
                      <button
                        onClick={() => setRatingBooking(b)}
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 flex items-center gap-1.5 border border-amber-200 transition-colors min-h-[40px]"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Rate Assistant</span>
                      </button>
                    )}

                    {b.rating && (
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>You rated {b.rating.stars}★</span>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <button
                      onClick={() => onSelectBooking(b)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F42F73] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#D81B60] min-h-[40px]"
                    >
                      <span>Track Live Assistance</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <InvoiceModal
        isOpen={!!selectedInvoiceBooking}
        onClose={() => setSelectedInvoiceBooking(null)}
        booking={selectedInvoiceBooking}
      />

      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          bookingId={ratingBooking.id}
          assistantName={ratingBooking.assistantName || 'Rajesh Sharma'}
        />
      )}
    </div>
  );
};
