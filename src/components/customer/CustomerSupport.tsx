import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, Shield, HelpCircle, CheckCircle2, Clock, Send, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export const CustomerSupport: React.FC = () => {
  const { currentUser } = useAuth();
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'BILLING' | 'SERVICE_QUALITY' | 'SAFETY' | 'GENERAL'>('SERVICE_QUALITY');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createSupportTicket({
        userId: currentUser?.id || 'cust-1',
        userName: currentUser?.name || 'Customer',
        userRole: 'CUSTOMER',
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDescription,
        priority: ticketCategory === 'SAFETY' ? 'HIGH' : 'MEDIUM'
      });
      setSubmitted(true);
      setTicketSubject('');
      setTicketDescription('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      <div>
        <div className="text-xs font-bold text-[#F42F73] uppercase tracking-wider">24x7 Customer Helpdesk</div>
        <h1 className="text-2xl sm:text-3xl font-black mt-1">Diblo Support & Assistance</h1>
        <p className="text-xs text-gray-500 mt-0.5">We are here to assist with bookings, payments, and verified safety.</p>
      </div>

      {/* Direct Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <a
          href="tel:8291919829"
          className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:border-[#F42F73] transition-all flex flex-col items-center text-center space-y-2 group min-h-[44px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Phone className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-[#14213D]">Call 8291919829</div>
          <div className="text-[11px] text-gray-500">24x7 Priority Support Helpline</div>
        </a>

        <a
          href="mailto:support@diblo.in"
          className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:border-[#F42F73] transition-all flex flex-col items-center text-center space-y-2 group min-h-[44px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-[#14213D]">support@diblo.in</div>
          <div className="text-[11px] text-gray-500">Official inquiries & invoices</div>
        </a>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col items-center text-center space-y-2 sm:col-span-2 md:col-span-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-[#14213D]">Mumbai Safety Cell</div>
          <div className="text-[11px] text-gray-500">Instant Police & SOS coordination</div>
        </div>
      </div>

      {/* Support Ticket Submission Form */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#14213D]">Create a Support Ticket</h3>
          <p className="text-xs text-gray-500">Our operations desk responds within 15 minutes.</p>
        </div>

        {submitted && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Support ticket submitted! Ticket #TKT-{Date.now().toString().slice(-4)} has been assigned to Mumbai operations.</span>
          </div>
        )}

        <form onSubmit={handleSubmitTicket} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Issue Category</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold min-h-[44px]"
              >
                <option value="SERVICE_QUALITY">Service Quality & Assistant Feedback</option>
                <option value="BILLING">Billing, Refund & Invoices</option>
                <option value="SAFETY">Safety or Trust Concern (High Priority)</option>
                <option value="GENERAL">General Inquiries / Society Tie-ups</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Subject / Summary</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="e.g. Assistance duration query"
                required
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Description</label>
            <textarea
              rows={4}
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              placeholder="Please explain the issue or query in detail..."
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Support Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
