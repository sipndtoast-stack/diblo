import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: string;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, page }) => {
  if (!isOpen) return null;

  const content: Record<string, { title: string; subtitle: string; body: React.ReactNode }> = {
    SAFETY: {
      title: 'Diblo Safety & Police Verification Policy',
      subtitle: 'Mandatory background screening & urban safety standards in Mumbai',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-bold text-sm text-[#14213D]">1. 100% Police Clearance & ID Verification</h4>
          <p>
            Every Diblo assistant in Mumbai undergoes comprehensive background verification including government Aadhaar biometric verification, permanent address physical inspection, and Mumbai Police record clearance.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">2. Start OTP Verification Protocol</h4>
          <p>
            No assistant is authorized to start service until the customer provides the dynamic 4-digit Start OTP generated on the Diblo app. This prevents unauthorized personnel or premature meter starts.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">3. 24x7 Emergency SOS Response</h4>
          <p>
            During any active task, both customer and assistant have one-tap access to the Diblo Mumbai SOS Desk and Mumbai Police Emergency Control (112). Real-time GPS coordinates are shared with emergency responders instantly.
          </p>
        </div>
      )
    },
    TERMS: {
      title: 'Terms of Service & Usage',
      subtitle: 'Guidelines governing the Diblo urban assistance platform',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-bold text-sm text-[#14213D]">1. Scope of Assistance</h4>
          <p>
            Diblo assistants are hourly human facilitators for permissible everyday tasks: hospital visit accompaniment, senior citizen escort, queue standing, supermarket grocery shopping, and permitted office/government document queuing.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">2. Prohibited Services</h4>
          <p>
            Assistants shall NEVER be requested to transport illegal substances, handle cash or jewellery exceeding statutory limits, sign legal contracts on behalf of customers, or perform hazardous physical tasks.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">3. Transparent Hourly Pricing</h4>
          <p>
            The standard rate is fixed at ₹149/hour with a mandatory minimum booking of 2 hours (₹298). Time extensions are billed at ₹149/hour in 1-hour increments.
          </p>
        </div>
      )
    },
    PRIVACY: {
      title: 'Privacy Policy & Data Security',
      subtitle: 'How Diblo protects your personal and location data',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-bold text-sm text-[#14213D]">1. Data Collection</h4>
          <p>
            We collect your phone number, name, and service location strictly for booking dispatch, safety verification, and invoice generation.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">2. Payment Security</h4>
          <p>
            All payments are processed through Razorpay's PCI-DSS Level 1 compliant gateway. Diblo never stores your credit/debit card numbers or UPI PINs.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">3. Phone Number Masking</h4>
          <p>
            Calls made between customers and assistants are routed through secure virtual numbers to protect your private contact details.
          </p>
        </div>
      )
    },
    CANCELLATION: {
      title: 'Cancellation & Refund Policy',
      subtitle: 'Fair and transparent cancellation rules for Mumbai users',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-bold text-sm text-[#14213D]">1. Free Cancellation</h4>
          <p>
            You may cancel your booking with 100% full refund at any time before the assistant arrives at your location.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">2. Cancellation Post-Arrival</h4>
          <p>
            If cancelled after the assistant has reached your doorstep, a base travel convenience charge of ₹99 is applicable to compensate the assistant's transit.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">3. Refund Timelines</h4>
          <p>
            Approved refunds are credited back to the original payment source (UPI/Card/Bank) via Razorpay within 2 to 4 business hours.
          </p>
        </div>
      )
    },
    CODE_OF_CONDUCT: {
      title: 'Assistant Code of Conduct',
      subtitle: 'Professional standards expected from all Diblo partners',
      body: (
        <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-bold text-sm text-[#14213D]">1. Punctuality and Courtesy</h4>
          <p>
            Assistants must report on time, wear the official Diblo badge, speak respectfully in Marathi, Hindi, or English, and show patience when dealing with seniors or hospital patients.
          </p>
          <h4 className="font-bold text-sm text-[#14213D]">2. Zero Tolerance Policy</h4>
          <p>
            Any form of discrimination, dishonesty, harassment, or unsafe behavior results in immediate permanent off-boarding and escalation to Mumbai police authorities.
          </p>
        </div>
      )
    }
  };

  const activeContent = content[page] || content.SAFETY;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] text-[#14213D]"
        >
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              <div className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">Diblo Policy Document</div>
              <h3 className="text-lg font-black text-[#14213D]">{activeContent.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{activeContent.subtitle}</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto py-4 space-y-4 flex-1">
            {activeContent.body}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#14213D] hover:bg-[#1E293B] text-white text-xs font-bold transition-all"
            >
              Understood & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
