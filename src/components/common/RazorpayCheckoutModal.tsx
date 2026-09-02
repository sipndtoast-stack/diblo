import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, CreditCard, Smartphone, Building, Wallet, X, Lock, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  onPaymentSuccess: (paymentData: { paymentId: string; orderId: string; invoiceNumber: string }) => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  amount,
  customerName,
  customerPhone,
  customerEmail,
  serviceName,
  onPaymentSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [upiApp, setUpiApp] = useState<'GPAY' | 'PHONEPE' | 'PAYTM' | 'OTHER'>('GPAY');
  const [cardNumber, setCardNumber] = useState('4532 8901 2345 6789');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('821');
  const [cardName, setCardName] = useState(customerName || 'Aarav Mehta');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');

  if (!isOpen) return null;

  const handlePayNow = async () => {
    setIsProcessing(true);
    setStep('PROCESSING');

    try {
      // Step 1: Create Order on backend
      const orderRes = await api.createPaymentOrder(amount, bookingId);
      const orderId = orderRes.orderId || `order_${Date.now()}`;

      // Simulate secure Razorpay processing delay (1.5s)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Step 2: Verify payment on backend with signature settlement
      const verifyRes = await api.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_${Date.now()}`,
        bookingId,
        paymentMethod: selectedMethod === 'UPI' ? `UPI (${upiApp})` : selectedMethod === 'CARD' ? 'Credit Card' : selectedBank
      });

      if (verifyRes.success) {
        setStep('SUCCESS');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        setTimeout(() => {
          onPaymentSuccess({
            paymentId: verifyRes.paymentId,
            orderId,
            invoiceNumber: verifyRes.invoiceNumber || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`
          });
        }, 1200);
      }
    } catch (err) {
      console.error('Payment processing failed', err);
      alert('Payment could not be processed. Please try again.');
      setStep('SELECT');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
        >
          {/* Razorpay Brand Header */}
          <div className="bg-[#0C2340] text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <span className="font-extrabold text-[#00BAF2] text-lg tracking-tight">R</span>
              </div>
              <div>
                <div className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                  <span>Secured by</span>
                  <span className="font-bold text-white tracking-wide">Razorpay</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                </div>
                <div className="text-sm font-semibold text-white">Diblo Technologies Pvt Ltd</div>
              </div>
            </div>
            {step === 'SELECT' && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Amount Bar */}
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Service</div>
              <div className="text-sm font-semibold text-[#14213D] truncate max-w-[220px]">{serviceName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium">Total Payable</div>
              <div className="text-lg font-black text-[#F42F73]">₹{amount}</div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {step === 'SELECT' && (
              <div className="space-y-5">
                {/* Method Tabs */}
                <div className="grid grid-cols-4 gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
                  <button
                    onClick={() => setSelectedMethod('UPI')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      selectedMethod === 'UPI' ? 'bg-white text-[#F42F73] shadow-sm' : 'text-gray-600 hover:text-[#14213D]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>UPI</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('CARD')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      selectedMethod === 'CARD' ? 'bg-white text-[#F42F73] shadow-sm' : 'text-gray-600 hover:text-[#14213D]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('NETBANKING')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      selectedMethod === 'NETBANKING' ? 'bg-white text-[#F42F73] shadow-sm' : 'text-gray-600 hover:text-[#14213D]'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>NetBank</span>
                  </button>
                  <button
                    onClick={() => setSelectedMethod('WALLET')}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      selectedMethod === 'WALLET' ? 'bg-white text-[#F42F73] shadow-sm' : 'text-gray-600 hover:text-[#14213D]'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
                  </button>
                </div>

                {/* UPI Tab Content */}
                {selectedMethod === 'UPI' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'GPAY', name: 'Google Pay', icon: '🟢' },
                        { id: 'PHONEPE', name: 'PhonePe', icon: '🟣' },
                        { id: 'PAYTM', name: 'Paytm UPI', icon: '🔵' }
                      ].map((app) => (
                        <button
                          key={app.id}
                          onClick={() => setUpiApp(app.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            upiApp === app.id
                              ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73] font-bold shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="text-lg">{app.icon}</span>
                          <span className="text-xs">{app.name}</span>
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Or enter UPI ID / VPA</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="mobileNumber@upi / username@okhdfcbank"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                      />
                    </div>
                  </div>
                )}

                {/* Card Tab Content */}
                {selectedMethod === 'CARD' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Name on Card</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                      />
                    </div>
                  </div>
                )}

                {/* Netbanking Tab Content */}
                {selectedMethod === 'NETBANKING' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Select Bank</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Bank of Baroda'].map((bank) => (
                        <button
                          key={bank}
                          onClick={() => setSelectedBank(bank)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                            selectedBank === bank
                              ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73] font-bold'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wallet Tab Content */}
                {selectedMethod === 'WALLET' && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                      <div className="text-xs text-gray-500 font-medium">Diblo Cash Wallet Balance</div>
                      <div className="text-xl font-extrabold text-[#14213D] mt-1">₹350.00</div>
                      <div className="text-[11px] text-[#10B981] font-semibold mt-1">✓ Sufficient balance available</div>
                    </div>
                  </div>
                )}

                {/* Pay Button */}
                <button
                  onClick={handlePayNow}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-base shadow-lg shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹{amount}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>

                <div className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span>256-bit SSL Encrypted • RBI Guideline Compliant</span>
                </div>
              </div>
            )}

            {step === 'PROCESSING' && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-[#F42F73] animate-spin mx-auto" />
                <div>
                  <h4 className="text-base font-bold text-[#14213D]">Processing Secure Payment</h4>
                  <p className="text-xs text-gray-500 mt-1">Please do not press back or refresh the window...</p>
                </div>
              </div>
            )}

            {step === 'SUCCESS' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-extrabold text-[#14213D]">Payment Successful!</h4>
                  <p className="text-xs text-gray-500 mt-1">₹{amount} paid securely to Diblo Technologies</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Booking confirmed & verified on backend</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
