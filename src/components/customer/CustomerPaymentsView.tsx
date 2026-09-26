import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Receipt,
  Plus,
  Lock,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { Booking } from '../../types';
import { InvoiceModal } from '../common/InvoiceModal';
import { CustomerSpendingAnalytics } from './CustomerSpendingAnalytics';

export const CustomerPaymentsView: React.FC = () => {
  const { bookings } = useBooking();
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  // Filter bookings that have completed or paid amounts
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'PAID' || b.status === 'COMPLETED');
  const totalAmountSpent = bookings.reduce((sum, b) => sum + (b.totalAmount || (b.hourlyRate || 149) * (b.bookedHours || 2)), 0);

  const filteredBookings = bookings.filter((b) => {
    if (paymentFilter === 'PAID') return b.paymentStatus === 'PAID' || b.status === 'COMPLETED';
    if (paymentFilter === 'PENDING') return b.paymentStatus === 'PENDING' && b.status !== 'COMPLETED';
    return true;
  });

  const handleOpenInvoice = (b: Booking) => {
    setSelectedBookingForInvoice(b);
    setIsInvoiceOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner & Payment Stats */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight">
              Payments & Invoices
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Secure GST tax invoices, verified UPI settlements, and payment history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Total Spent</div>
            <div className="text-lg sm:text-xl font-black text-[#14213D]">
              ₹{totalAmountSpent.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Settled Invoices</div>
            <div className="text-lg sm:text-xl font-black text-emerald-600">
              {paidBookings.length}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Gateway Compliance Strip */}
      <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-[#14213D]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>PCI-DSS Level 1 Encrypted:</strong> All payments processed securely via Razorpay. Diblo never stores your bank pins or UPI passwords.
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 w-fit">
          256-Bit SSL Secured
        </span>
      </div>

      {/* Spending Analytics Chart */}
      <CustomerSpendingAnalytics />

      {/* Saved Payment Methods Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-[#14213D]">Saved Payment Methods</h3>
            <p className="text-xs text-gray-500">Quick 1-click checkout for errands in Mumbai</p>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            Active UPI Autopay
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-700">
                GPay
              </div>
              <div>
                <div className="text-xs font-bold text-[#14213D]">Google Pay UPI</div>
                <div className="text-[10px] text-gray-500 font-mono">aarav.mehta@okhdfcbank</div>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-white border border-emerald-300 px-1.5 py-0.5 rounded">
              Default
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-indigo-700">
                HDFC
              </div>
              <div>
                <div className="text-xs font-bold text-[#14213D]">HDFC Visa Credit</div>
                <div className="text-[10px] text-gray-500 font-mono">•••• •••• •••• 4092</div>
              </div>
            </div>
            <span className="text-[9px] text-gray-400">Verified</span>
          </div>

          <div className="p-3.5 rounded-2xl border border-dashed border-gray-200 hover:border-[#F42F73] transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-[#F42F73] cursor-pointer">
            <Plus className="w-4 h-4" />
            <span className="text-xs font-bold">Add UPI / Card</span>
          </div>
        </div>
      </div>

      {/* Invoices & Transaction History */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-[#14213D]">Transaction History & GST Invoices</h3>
            <p className="text-xs text-gray-500">Download itemized receipts for reimbursement or record-keeping</p>
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'PAID', 'PENDING'] as const).map((filterType) => (
              <button
                key={filterType}
                type="button"
                onClick={() => setPaymentFilter(filterType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paymentFilter === filterType
                    ? 'bg-[#14213D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterType}
              </button>
            ))}
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-gray-300" />
            <div className="text-xs font-bold">No transactions found</div>
            <p className="text-[11px] text-gray-400">Book an assistant to see your invoice settlements here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map((b) => {
              const amount = b.totalAmount || (b.hourlyRate || 149) * (b.bookedHours || 2);
              const invoiceNum = b.invoiceNumber || `INV-${b.id.slice(-6).toUpperCase()}`;
              const isPaid = b.paymentStatus === 'PAID' || b.status === 'COMPLETED';

              return (
                <div
                  key={b.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-gray-50/50 rounded-2xl px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-[#14213D] shrink-0">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#14213D]">
                          {b.serviceName}
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'PENDING'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span>Invoice: <strong>{invoiceNum}</strong></span>
                        <span>•</span>
                        <span>{b.bookingDate || 'Recent'}</span>
                        <span>•</span>
                        <span>{b.location?.area || 'Mumbai'}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Method: {b.paymentMethod || 'Razorpay UPI'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-black text-[#14213D]">
                        ₹{amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {b.bookedHours || b.totalHours || 2} hrs @ ₹{b.hourlyRate || 149}/hr
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenInvoice(b)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#F42F73] text-gray-700 hover:text-[#F42F73] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white hover:bg-rose-50/50 min-h-[36px]"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedBookingForInvoice && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => {
            setIsInvoiceOpen(false);
            setSelectedBookingForInvoice(null);
          }}
          booking={selectedBookingForInvoice}
        />
      )}
    </div>
  );
};
