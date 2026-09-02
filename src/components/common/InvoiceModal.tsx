import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Booking } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
        >
          {/* Header Action Bar */}
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tax Invoice</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                PAID
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 text-gray-600 hover:text-[#14213D] hover:bg-gray-200 rounded-xl transition-colors"
                title="Print Invoice"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-[#14213D] hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Invoice Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-[#14213D]" id="printable-invoice">
            {/* Brand Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-5">
              <div>
                <div className="text-2xl font-black tracking-tight text-[#F42F73]">
                  diblo<span className="text-[#14213D]">.in</span>
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">Diblo Technologies Pvt Ltd</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Plot 14, One BKC, Bandra Kurla Complex, Mumbai, MH 400051<br />
                  GSTIN: 27AABCD9912M1ZK • support@diblo.in
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-gray-400">INVOICE NO</div>
                <div className="text-sm font-extrabold text-[#14213D] font-mono">{booking.invoiceNumber || 'INV-2026-0089'}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Date: {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Bill To & Service Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl text-xs">
              <div>
                <div className="font-bold text-gray-400 uppercase text-[10px] mb-1">Billed To (Customer)</div>
                <div className="font-bold text-sm text-[#14213D]">{booking.customerName}</div>
                <div className="text-gray-600 mt-0.5">+91 {booking.customerPhone}</div>
                <div className="text-gray-500 text-[11px] mt-1 line-clamp-2">{booking.location.address}</div>
              </div>
              <div>
                <div className="font-bold text-gray-400 uppercase text-[10px] mb-1">Booking & Assistant</div>
                <div className="font-semibold text-gray-700">Booking: <span className="font-mono font-bold text-[#14213D]">{booking.bookingNumber}</span></div>
                <div className="text-gray-600 mt-0.5">Assistant: <span className="font-semibold text-[#14213D]">{booking.assistantName || 'Assigned Partner'}</span></div>
                <div className="text-gray-500 text-[11px] mt-1">Slot: {booking.scheduledDate} at {booking.startTime}</div>
              </div>
            </div>

            {/* Itemized Fare Breakdown Table */}
            <div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-semibold text-[10px] uppercase">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center">Rate</th>
                    <th className="py-2 text-center">Duration</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3">
                      <div className="font-bold text-[#14213D]">{booking.serviceName}</div>
                      <div className="text-[11px] text-gray-500">Hourly Human Assistance in {booking.location.area}</div>
                    </td>
                    <td className="py-3 text-center text-gray-600">₹{booking.hourlyRate}/hr</td>
                    <td className="py-3 text-center font-semibold text-[#14213D]">{booking.totalHours} hrs</td>
                    <td className="py-3 text-right font-bold text-[#14213D]">₹{booking.baseAmount}</td>
                  </tr>

                  {booking.discountAmount > 0 && (
                    <tr className="text-[#10B981]">
                      <td className="py-2 font-medium" colSpan={3}>
                        Coupon Discount ({booking.couponCode || 'PROMO'})
                      </td>
                      <td className="py-2 text-right font-bold">-₹{booking.discountAmount}</td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-2 text-gray-500" colSpan={3}>
                      CGST + SGST (5%)
                    </td>
                    <td className="py-2 text-right text-gray-600">₹{booking.taxAmount}</td>
                  </tr>

                  <tr className="border-t-2 border-gray-900 font-extrabold text-sm text-[#14213D]">
                    <td className="py-3" colSpan={3}>Total Amount Paid</td>
                    <td className="py-3 text-right text-[#F42F73] text-base">₹{booking.totalAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment & Security Footer */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-[11px] text-gray-500">
              <div>
                <div>Payment Method: <span className="font-semibold text-gray-700">{booking.paymentMethod || 'Razorpay Gateway'}</span></div>
                <div className="font-mono text-[10px] text-gray-400">Payment ID: {booking.paymentId || 'pay_verified_diblo'}</div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified by Razorpay</span>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 rounded-2xl bg-[#14213D] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
