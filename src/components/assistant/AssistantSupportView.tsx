import React, { useState } from 'react';
import {
  HelpCircle,
  PhoneCall,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  Headphones
} from 'lucide-react';

export const AssistantSupportView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I accept a new order?',
      a: 'When you are ONLINE, a new order popup will appear with sound and vibration. Tap the green ACCEPT button within 45 seconds to confirm the order.'
    },
    {
      q: 'How do I start the service when I reach the customer?',
      a: 'Once you reach the location, tap "I HAVE ARRIVED". Ask the customer for their 4-digit Start OTP, enter it in the app, and tap Verify. Your timer will start immediately.'
    },
    {
      q: 'When do I receive my earnings payout?',
      a: 'Your earnings are accumulated and transferred directly to your registered bank account every Monday morning. You can check your pending payout in the EARNINGS section.'
    },
    {
      q: 'What should I do if the customer is not answering the phone?',
      a: 'Wait at the pickup location for 10 minutes. Try calling the customer again using the "Call Customer" button. If there is no response, tap CALL SUPPORT below and our operations team will assist you.'
    },
    {
      q: 'Can I go offline if I have an active task?',
      a: 'Yes, switching to OFFLINE pauses new incoming requests while allowing you to complete your ongoing customer service safely.'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#F42F73]" />
          <span>HELP & SUPPORT</span>
        </h2>
        <p className="text-xs text-gray-500">24x7 Dedicated Assistant Helpline & Safety Desk</p>
      </div>

      {/* Two Large Quick Action Buttons: CALL SUPPORT & WHATSAPP SUPPORT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="tel:+919820554433"
          className="p-5 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black flex items-center justify-between shadow-lg shadow-emerald-600/20 transition-all min-h-[72px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-extrabold">CALL SUPPORT</div>
              <div className="text-xs text-emerald-100 font-mono">+91 98205 54433</div>
            </div>
          </div>
          <span className="text-xs bg-white text-emerald-700 px-3 py-1.5 rounded-full font-black">
            24x7 Call
          </span>
        </a>

        <a
          href="https://wa.me/919820554433?text=Hello%20Diblo%20Support,%20I%20am%20an%20assistant%20and%20need%20help"
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-3xl bg-[#25D366] hover:bg-[#20BD5A] active:bg-[#1DA850] text-white font-black flex items-center justify-between shadow-lg shadow-emerald-500/20 transition-all min-h-[72px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-extrabold">WHATSAPP SUPPORT</div>
              <div className="text-xs text-emerald-100">Instant Chat Assistance</div>
            </div>
          </div>
          <span className="text-xs bg-white text-emerald-800 px-3 py-1.5 rounded-full font-black">
            Chat Now
          </span>
        </a>
      </div>

      {/* Safety & Help Notice */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-black text-[#14213D]">SOS & Safety Protection</div>
          <div className="text-gray-500 leading-relaxed">
            Your safety during assignments is our highest priority. All customer visits are GPS-monitored. In any emergency, call the Helpline immediately.
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-sm text-[#14213D] uppercase tracking-wide">
          Frequently Asked Questions (FAQ)
        </h3>

        <div className="divide-y divide-gray-100">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-3 text-xs sm:text-sm font-bold text-[#14213D] hover:text-[#F42F73] transition-colors py-1"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed pl-1 animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
