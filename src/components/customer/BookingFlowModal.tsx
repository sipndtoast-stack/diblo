import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  ShieldCheck,
  Tag,
  Sparkles,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  Navigation
} from 'lucide-react';
import { SERVICES } from '../../data/mockData';
import { ServiceItem, BookingLocation, UserRole } from '../../types';
import { IconHelper } from '../common/IconHelper';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { RazorpayCheckoutModal } from '../common/RazorpayCheckoutModal';
import { LocationPickerMap } from '../maps/LocationPickerMap';

interface BookingFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedService?: ServiceItem | null;
  onBookingSuccess: (bookingId: string) => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  isOpen,
  onClose,
  preSelectedService,
  onBookingSuccess
}) => {
  const { currentUser, customerProfile } = useAuth();
  const { createBooking } = useBooking();

  // Current Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Service
  const [selectedService, setSelectedService] = useState<ServiceItem>(preSelectedService || SERVICES[0]);

  // Step 2: Customer Phone & Contact
  const [phone, setPhone] = useState(currentUser?.phone || '9820123456');
  const [customerName, setCustomerName] = useState(currentUser?.name || 'Aarav Mehta');
  const [otpError, setOtpError] = useState('');

  // Step 3: Location
  const [selectedAddressType, setSelectedAddressType] = useState<'SAVED' | 'CURRENT' | 'CUSTOM'>('SAVED');
  const [savedAddressId, setSavedAddressId] = useState<string>('addr-1');
  const [customAddress, setCustomAddress] = useState('B-702, Sea Green Apartments, Carter Road, Bandra West');
  const [customLandmark, setCustomLandmark] = useState('Near Cafe Coffee Day');
  const [customArea, setCustomArea] = useState('Bandra West');
  const [customLat, setCustomLat] = useState(19.0607);
  const [customLng, setCustomLng] = useState(72.8258);
  const [hasDestination, setHasDestination] = useState(false);
  const [destinationAddress, setDestinationAddress] = useState('Lilavati Hospital, Bandra West');

  // Step 4: Date, Time & Hours
  const [dateType, setDateType] = useState<'TODAY' | 'TOMORROW' | 'CUSTOM'>('TODAY');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [bookedHours, setBookedHours] = useState<number>(2); // Minimum 2 hours

  // Step 5: Additional Details
  const [instructions, setInstructions] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [contactName, setContactName] = useState(currentUser?.name || 'Aarav Mehta');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '9820123456');
  const [emergencyPhone, setEmergencyPhone] = useState('9820987654');
  const [genderPreference, setGenderPreference] = useState<'ANY' | 'MALE' | 'FEMALE'>('ANY');

  // Step 6: Confirmation & Coupon
  const [couponCode, setCouponCode] = useState('DIBLOFIRST');
  const [discountAmount, setDiscountAmount] = useState<number>(100);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState('₹100 discount applied!');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Razorpay Checkout Trigger
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>('');

  useEffect(() => {
    if (preSelectedService) {
      setSelectedService(preSelectedService);
    }
  }, [preSelectedService]);

  if (!isOpen) return null;

  // Fare calculations
  const hourlyRate = selectedService.baseHourlyRate || 149;
  const baseAmount = bookedHours * hourlyRate;
  const netSubtotal = Math.max(0, baseAmount - discountAmount);
  const taxAmount = Math.round((netSubtotal * 5) / 100); // 5% GST
  const totalAmount = netSubtotal + taxAmount;

  // Contact details confirmation handler
  const handleContinueFromContact = () => {
    setOtpError('');
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }
    setCurrentStep(3); // Move to Location
  };

  // Coupon handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    setCouponSuccessMessage('');
    try {
      const res = await api.applyCoupon(couponCode, bookedHours, baseAmount);
      if (res.success) {
        setDiscountAmount(res.discountAmount);
        setCouponSuccessMessage(res.message);
      } else {
        setCouponError(res.error || 'Invalid coupon');
      }
    } catch {
      setCouponError('Invalid coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Final submit -> Creates booking on backend & opens Razorpay
  const handleConfirmAndPay = async () => {
    const finalLocation: BookingLocation = {
      address:
        selectedAddressType === 'SAVED'
          ? customerProfile?.savedAddresses.find((a) => a.id === savedAddressId)?.address || customAddress
          : customAddress,
      landmark: customLandmark,
      area: customArea,
      lat: customLat,
      lng: customLng
    };

    const bookingPayload = {
      customerId: customerProfile?.id || 'cust-1',
      customerName: customerName || currentUser?.name || 'Customer',
      customerPhone: phone || currentUser?.phone || '9820123456',
      serviceId: selectedService.id,
      serviceName: selectedService.title,
      serviceIcon: selectedService.icon,
      location: finalLocation,
      destinationLocation: hasDestination
        ? { address: destinationAddress, area: 'Mumbai', lat: 19.0550, lng: 72.8310 }
        : undefined,
      dateType,
      scheduledDate:
        dateType === 'TODAY'
          ? new Date().toISOString().split('T')[0]
          : dateType === 'TOMORROW'
          ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
          : customDate,
      startTime,
      bookedHours,
      hourlyRate,
      baseAmount,
      discountAmount,
      couponCode: discountAmount > 0 ? couponCode : undefined,
      taxAmount,
      totalAmount,
      instructions,
      specialRequirements,
      contactPerson: { name: contactName, phone: contactPhone },
      emergencyContact: { name: 'Emergency', phone: emergencyPhone },
      genderPreference
    };

    try {
      const created = await createBooking(bookingPayload);
      setCreatedBookingId(created.id);
      setIsRazorpayOpen(true);
    } catch (e) {
      console.error(e);
      alert('Failed to initiate booking. Please try again.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="bg-white w-full max-w-xl 2xl:max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-auto max-h-[95vh] sm:max-h-[92vh]"
        >
          {/* Top Step Header */}
          <div className="bg-[#14213D] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors min-h-[36px]"
                  aria-label="Previous step"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <div className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">
                  Step {currentStep} of 6
                </div>
                <div className="text-xs sm:text-base font-bold text-white leading-tight">
                  {currentStep === 1 && 'Select Assistance Service'}
                  {currentStep === 2 && 'Customer Contact Details'}
                  {currentStep === 3 && 'Select Location in Mumbai'}
                  {currentStep === 4 && 'Date, Time & Duration'}
                  {currentStep === 5 && 'Instructions & Preference'}
                  {currentStep === 6 && 'Review Fare & Confirm'}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors min-h-[36px]"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Indicator Bar */}
          <div className="w-full bg-gray-100 h-1.5 flex">
            {[1, 2, 3, 4, 5, 6].map((st) => (
              <div
                key={st}
                className={`flex-1 h-full transition-all duration-300 ${
                  st <= currentStep ? 'bg-[#F42F73]' : 'bg-transparent'
                }`}
              />
            ))}
          </div>

          {/* Scrollable Form Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            {/* ======================================================== */}
            {/* STEP 1: SELECT SERVICE */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  Choose the type of human assistance you need. All services are billed at ₹149/hour.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 max-h-[360px] sm:max-h-[380px] overflow-y-auto pr-1">
                  {SERVICES.map((s) => {
                    const isSelected = selectedService.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={`p-3 sm:p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 min-h-[56px] ${
                          isSelected
                            ? 'border-[#F42F73] bg-[#FFF0F5] shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#F42F73] text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <IconHelper name={s.icon} className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-[#14213D] flex items-center justify-between">
                            <span>{s.title}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#F42F73]" />}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{s.tagline}</div>
                          <div className="text-[11px] font-extrabold text-[#F42F73] mt-1">₹149/hr</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                >
                  <span>Next: Customer Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: CUSTOMER CONTACT DETAILS */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  Confirm your contact information so your Diblo assistant can coordinate with you smoothly.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#14213D] mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Aarav Mehta"
                      className="w-full px-3.5 py-3 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#14213D] mb-1">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center min-h-[44px]">
                        🇮🇳 +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9820123456"
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                      />
                    </div>
                  </div>

                  {otpError && (
                    <div className="text-xs text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{otpError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleContinueFromContact}
                    className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                  >
                    <span>Continue to Location</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: LOCATION SELECTOR (GOOGLE MAPS INTEGRATED) */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  Where should your Diblo assistant report in Mumbai?
                </div>

                {/* Location Type Pills */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
                  {[
                    { id: 'SAVED', label: 'Saved Address' },
                    { id: 'CURRENT', label: 'Current GPS' },
                    { id: 'CUSTOM', label: 'Search / Pin' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedAddressType(t.id as any)}
                      className={`py-2 px-1.5 sm:px-2 rounded-xl text-center transition-all min-h-[38px] flex items-center justify-center ${
                        selectedAddressType === t.id
                          ? 'bg-white text-[#F42F73] font-bold shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Saved Addresses List */}
                {selectedAddressType === 'SAVED' && (
                  <div className="space-y-2">
                    {customerProfile?.savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => {
                          setSavedAddressId(addr.id);
                          setCustomAddress(addr.address);
                          setCustomArea(addr.area);
                          setCustomLat(addr.lat);
                          setCustomLng(addr.lng);
                        }}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          savedAddressId === addr.id
                            ? 'border-[#F42F73] bg-[#FFF0F5]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${savedAddressId === addr.id ? 'text-[#F42F73]' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-[#14213D] flex items-center justify-between">
                            <span>{addr.title} ({addr.area})</span>
                            {savedAddressId === addr.id && <Check className="w-3.5 h-3.5 text-[#F42F73]" />}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{addr.address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Address / Interactive Map */}
                {(selectedAddressType === 'CUSTOM' || selectedAddressType === 'CURRENT') && (
                  <div className="space-y-3">
                    <LocationPickerMap
                      initialLat={customLat}
                      initialLng={customLng}
                      initialAddress={customAddress}
                      initialArea={customArea}
                      height="240px"
                      showConfirmButton={false}
                      onLocationSelected={(loc) => {
                        setCustomLat(loc.lat);
                        setCustomLng(loc.lng);
                        setCustomAddress(loc.address);
                        setCustomArea(loc.area);
                      }}
                    />

                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#14213D] mb-1">Flat / Building / Specific Door Details</label>
                        <input
                          type="text"
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          placeholder="e.g. Flat 502, Orchid Heights, Carter Road"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-[#14213D] mb-1">Landmark (Optional)</label>
                          <input
                            type="text"
                            value={customLandmark}
                            onChange={(e) => setCustomLandmark(e.target.value)}
                            placeholder="Near Cafe Coffee Day"
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#14213D] mb-1">Selected Area</label>
                          <input
                            type="text"
                            value={customArea}
                            onChange={(e) => setCustomArea(e.target.value)}
                            placeholder="Bandra West"
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Second Destination (for errand / hospital run) */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 min-h-[32px]">
                    <input
                      type="checkbox"
                      checked={hasDestination}
                      onChange={(e) => setHasDestination(e.target.checked)}
                      className="rounded text-[#F42F73] focus:ring-[#F42F73] w-4 h-4"
                    />
                    <span>Add a 2nd stop / hospital / market destination</span>
                  </label>
                  {hasDestination && (
                    <input
                      type="text"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="e.g. Lilavati Hospital OPD / Nature's Basket Pali Hill"
                      className="mt-2 w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                    />
                  )}
                </div>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                >
                  <span>Next: Choose Date & Duration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: DATE, TIME & HOURS (TRANSPARENT ₹149/HR MATH) */}
            {/* ======================================================== */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  Select booking schedule. Minimum booking is 2 hours at flat ₹149/hr.
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1.5">Date</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'TODAY', label: 'Today' },
                      { id: 'TOMORROW', label: 'Tomorrow' },
                      { id: 'CUSTOM', label: 'Pick Date' }
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDateType(d.id as any)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] flex items-center justify-center ${
                          dateType === d.id
                            ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {dateType === 'CUSTOM' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="mt-2 w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] min-h-[44px]"
                    />
                  )}
                </div>

                {/* Start Time Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1.5">Start Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D] min-h-[44px]"
                  >
                    {[
                      '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
                      '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
                      '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
                    ].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Duration Stepper */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#14213D]">Number of Hours</div>
                      <div className="text-[11px] text-gray-500">Minimum 2 hours requirement</div>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
                      <button
                        onClick={() => setBookedHours((prev) => Math.max(2, prev - 1))}
                        disabled={bookedHours <= 2}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-gray-800 transition-colors min-h-[32px]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-[#14213D] w-6 text-center">{bookedHours}</span>
                      <button
                        onClick={() => setBookedHours((prev) => Math.min(10, prev + 1))}
                        className="w-8 h-8 rounded-lg bg-[#FFF0F5] hover:bg-[#F42F73] hover:text-white flex items-center justify-center text-[#F42F73] transition-colors min-h-[32px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Transparent Calculation Breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-500">
                      {bookedHours} hours × ₹149/hr
                    </span>
                    <span className="text-[#14213D] font-bold text-sm">
                      ₹{baseAmount}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(5)}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                >
                  <span>Next: Errand Details & Notes</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 5: ADDITIONAL DETAILS & PREFERENCES */}
            {/* ======================================================== */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 font-medium">
                  Provide instructions so your assistant comes fully prepared.
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1">
                    Specific Task Instructions / Errand Notes
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Accompanying elderly father for MRI scan. Please bring wheelchair assistance."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#F42F73]"
                  />
                </div>

                {/* Gender Preference */}
                <div>
                  <label className="block text-xs font-bold text-[#14213D] mb-1.5">
                    Assistant Gender Preference (Where operationally appropriate)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ANY', label: 'No Preference' },
                      { id: 'FEMALE', label: 'Female Only' },
                      { id: 'MALE', label: 'Male Only' }
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGenderPreference(g.id as any)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all min-h-[44px] flex items-center justify-center ${
                          genderPreference === g.id
                            ? 'border-[#F42F73] bg-[#FFF0F5] text-[#F42F73]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#14213D] mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14213D] mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#14213D] min-h-[44px]"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(6)}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F42F73]/20 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                >
                  <span>Next: Review & Confirm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 6: CONFIRM BOOKING & PAY (RAZORPAY INTEGRATION) */}
            {/* ======================================================== */}
            {currentStep === 6 && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Service</span>
                    <span className="font-bold text-[#14213D]">{selectedService.title}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Schedule</span>
                    <span className="font-semibold text-[#14213D]">{dateType} at {startTime}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Duration</span>
                    <span className="font-semibold text-[#14213D]">{bookedHours} Hours</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Location</span>
                    <span className="font-semibold text-[#14213D] truncate max-w-[200px]">{customArea}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Gender Pref.</span>
                    <span className="font-semibold text-[#14213D]">{genderPreference}</span>
                  </div>
                </div>

                {/* Coupon Code Box */}
                <div className="bg-[#FFF0F5]/60 p-3.5 rounded-2xl border border-[#F42F73]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#14213D] flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-[#F42F73]" />
                      <span>Have a Promo Coupon?</span>
                    </span>
                    <span className="text-[10px] text-gray-400">Try DIBLOFIRST</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER COUPON"
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-[#14213D] uppercase min-h-[44px]"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                      className="px-4 py-2 rounded-xl bg-[#14213D] text-white text-xs font-bold hover:bg-[#1E293B] min-h-[44px]"
                    >
                      Apply
                    </button>
                  </div>
                  {couponSuccessMessage && (
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{couponSuccessMessage}</span>
                    </div>
                  )}
                  {couponError && (
                    <div className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{couponError}</span>
                    </div>
                  )}
                </div>

                {/* Fare Summary Breakdown */}
                <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                  <div className="flex justify-between">
                    <span>Base Hourly Assistance ({bookedHours} hrs × ₹149)</span>
                    <span className="font-semibold text-[#14213D]">₹{baseAmount}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Promo Discount ({couponCode})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400">
                    <span>CGST + SGST (5%)</span>
                    <span>₹{taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#14213D] pt-2 border-t border-gray-200">
                    <span>Total Amount Payable</span>
                    <span className="text-[#F42F73] text-base">₹{totalAmount}</span>
                  </div>
                </div>

                {/* Primary CTA: Confirm & Pay */}
                <button
                  onClick={handleConfirmAndPay}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-xs sm:text-sm shadow-xl shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[48px]"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm & Pay ₹{totalAmount}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>

                <div className="text-center text-[10px] text-gray-400">
                  Backed by Diblo 100% Satisfaction & Verification Guarantee
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Razorpay Gateway Checkout Modal */}
      {isRazorpayOpen && (
        <RazorpayCheckoutModal
          isOpen={isRazorpayOpen}
          onClose={() => setIsRazorpayOpen(false)}
          bookingId={createdBookingId}
          amount={totalAmount}
          customerName={customerName}
          customerPhone={phone}
          serviceName={selectedService.title}
          onPaymentSuccess={({ paymentId, orderId, invoiceNumber }) => {
            setIsRazorpayOpen(false);
            onClose();
            onBookingSuccess(createdBookingId);
          }}
        />
      )}
    </>
  );
};
