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
  Navigation,
  Heart,
  Star
} from 'lucide-react';
import { SERVICES, MOCK_ASSISTANTS } from '../../data/mockData';
import { ServiceItem, BookingLocation, UserRole, AssistantProfile } from '../../types';
import { IconHelper } from '../common/IconHelper';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { RazorpayCheckoutModal } from '../common/RazorpayCheckoutModal';
import { LocationPickerMap, SelectedLocationData, RouteCalculationSummary } from '../maps/LocationPickerMap';
import { normalizeBookingStatus } from '../../lib/firestoreBookings';

interface BookingFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedService?: ServiceItem | null;
  preSelectedAssistant?: AssistantProfile | null;
  initialCouponCode?: string;
  onBookingSuccess: (bookingId: string) => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  isOpen,
  onClose,
  preSelectedService,
  preSelectedAssistant,
  initialCouponCode,
  onBookingSuccess
}) => {
  const { currentUser, customerProfile, favoriteAssistantIds } = useAuth();
  const { createBooking, bookings, activeBooking } = useBooking();

  // Current Step (1 to 7, where 7 is Real-Time Booking Confirmation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Preferred Helper selection
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantProfile | null>(
    preSelectedAssistant || null
  );

  // Step 1: Service
  const [selectedService, setSelectedService] = useState<ServiceItem>(() => {
    if (preSelectedService) return preSelectedService;
    if (preSelectedAssistant && preSelectedAssistant.serviceCapabilities?.length > 0) {
      const match = SERVICES.find((s) => preSelectedAssistant.serviceCapabilities.includes(s.id));
      if (match) return match;
    }
    return SERVICES[0];
  });

  // Step 2: Customer Phone & Contact (Real authenticated customer only, no demo customer defaults)
  const [phone, setPhone] = useState(customerProfile?.phone || currentUser?.phone || '');
  const [customerName, setCustomerName] = useState(
    customerProfile?.name || (currentUser?.name && currentUser.name !== 'Customer' ? currentUser.name : '')
  );
  const [otpError, setOtpError] = useState('');

  // Step 3: Location (Real Google Maps + Places API New + Routes API)
  const hasSavedAddresses = Boolean(customerProfile?.savedAddresses && customerProfile.savedAddresses.length > 0);
  const [selectedAddressType, setSelectedAddressType] = useState<'SAVED' | 'CURRENT' | 'CUSTOM'>(
    hasSavedAddresses ? 'SAVED' : 'CUSTOM'
  );
  const [savedAddressId, setSavedAddressId] = useState<string>(
    customerProfile?.savedAddresses?.[0]?.id || ''
  );
  const [customAddress, setCustomAddress] = useState(
    customerProfile?.savedAddresses?.[0]?.address || ''
  );
  const [customLandmark, setCustomLandmark] = useState(
    customerProfile?.savedAddresses?.[0]?.landmark || ''
  );
  const [customArea, setCustomArea] = useState(
    customerProfile?.savedAddresses?.[0]?.area || 'Bandra West'
  );
  const [customLat, setCustomLat] = useState(
    customerProfile?.savedAddresses?.[0]?.lat || 19.0607
  );
  const [customLng, setCustomLng] = useState(
    customerProfile?.savedAddresses?.[0]?.lng || 72.8258
  );
  const [customPlaceId, setCustomPlaceId] = useState<string | undefined>(undefined);
  const [destinationData, setDestinationData] = useState<SelectedLocationData | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteCalculationSummary | null>(null);

  // Step 4: Date, Time & Hours
  const [dateType, setDateType] = useState<'TODAY' | 'TOMORROW' | 'CUSTOM'>('TODAY');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [bookedHours, setBookedHours] = useState<number>(2); // Minimum 2 hours

  // Step 5: Additional Details
  const [instructions, setInstructions] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [contactName, setContactName] = useState(
    customerProfile?.name || (currentUser?.name && currentUser.name !== 'Customer' ? currentUser.name : '')
  );
  const [contactPhone, setContactPhone] = useState(customerProfile?.phone || currentUser?.phone || '');
  const [emergencyPhone, setEmergencyPhone] = useState(customerProfile?.emergencyContact?.phone || '');
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

  useEffect(() => {
    if (preSelectedAssistant) {
      setSelectedAssistant(preSelectedAssistant);
      if (!preSelectedService && preSelectedAssistant.serviceCapabilities?.length > 0) {
        const matchingSvc = SERVICES.find((s) => preSelectedAssistant.serviceCapabilities.includes(s.id));
        if (matchingSvc) setSelectedService(matchingSvc);
      }
    }
  }, [preSelectedAssistant]);

  useEffect(() => {
    if (initialCouponCode) {
      setCouponCode(initialCouponCode.toUpperCase());
      setDiscountAmount(100);
      setCouponSuccessMessage(`Referral Reward Coupon ${initialCouponCode.toUpperCase()} applied! Saved ₹100`);
      setCouponError('');
    }
  }, [initialCouponCode]);

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

  // Final submit -> Creates booking on backend & Firebase, then opens Razorpay
  const handleConfirmAndPay = async () => {
    const finalLocation: BookingLocation = {
      address:
        selectedAddressType === 'SAVED'
          ? customerProfile?.savedAddresses?.find((a) => a.id === savedAddressId)?.address || customAddress
          : customAddress,
      landmark: customLandmark,
      area: customArea || 'Mumbai',
      lat: customLat,
      lng: customLng,
      latitude: customLat,
      longitude: customLng,
      placeId: customPlaceId
    };

    const finalDestination: BookingLocation | null = destinationData
      ? {
          address: destinationData.address,
          area: destinationData.area || 'Mumbai',
          lat: destinationData.lat,
          lng: destinationData.lng,
          latitude: destinationData.lat,
          longitude: destinationData.lng,
          placeId: destinationData.placeId
        }
      : null;

    const cleanCustPhone = (phone || customerProfile?.phone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);
    const resolvedCustId = customerProfile?.id || (cleanCustPhone ? `cust-${cleanCustPhone}` : currentUser?.id || `cust-${Date.now()}`);

    const bookingPayload = {
      customerId: resolvedCustId,
      customerName: customerName.trim() || customerProfile?.name || currentUser?.name || 'Customer',
      customerPhone: cleanCustPhone,
      serviceId: selectedService.id,
      serviceName: selectedService.title,
      serviceIcon: selectedService.icon,
      location: finalLocation,
      pickupLocation: finalLocation,
      destinationLocation: finalDestination,
      estimatedDistance: routeSummary?.distanceText || 'Within 2.5 km',
      estimatedDistanceKm: routeSummary?.distanceKm || 2.5,
      estimatedDuration: routeSummary?.durationText || `${bookedHours} hrs`,
      estimatedDurationMinutes: routeSummary?.durationMinutes || bookedHours * 60,
      routePolyline: routeSummary?.polyline || null,
      dateType,
      scheduledDate:
        dateType === 'TODAY'
          ? new Date().toISOString().split('T')[0]
          : dateType === 'TOMORROW'
          ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
          : customDate,
      startTime,
      bookedHours,
      totalHours: bookedHours,
      hourlyRate,
      baseAmount,
      discountAmount,
      couponCode: discountAmount > 0 ? couponCode : undefined,
      taxAmount,
      totalAmount,
      instructions,
      description: instructions || specialRequirements || '',
      specialRequirements,
      contactPerson: {
        name: contactName || customerName || 'Customer',
        phone: contactPhone || cleanCustPhone
      },
      emergencyContact: { name: 'Emergency', phone: emergencyPhone || cleanCustPhone },
      genderPreference,
      status: 'pending' as const,
      preferredAssistantId: selectedAssistant?.id || null,
      preferredAssistantName: selectedAssistant?.name || null,
      preferredAssistantPhoto: selectedAssistant?.photo || null,
      isPreferredRequested: Boolean(selectedAssistant)
    };

    try {
      const created = await createBooking(bookingPayload);
      setCreatedBookingId(created.id);
      setIsRazorpayOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const liveCreatedBooking =
    bookings.find((b) => b.id === createdBookingId) ||
    (activeBooking?.id === createdBookingId ? activeBooking : null);
  const liveCreatedStatus = normalizeBookingStatus(liveCreatedBooking?.status);
  const isAssistantAssignedLive =
    liveCreatedStatus === 'accepted' ||
    liveCreatedStatus === 'on_the_way' ||
    liveCreatedStatus === 'arrived' ||
    liveCreatedStatus === 'in_progress';

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
                  {currentStep <= 6 ? `Step ${currentStep} of 6` : 'Live Dispatch Status'}
                </div>
                <div className="text-xs sm:text-base font-bold text-white leading-tight">
                  {currentStep === 1 && 'Select Assistance Service'}
                  {currentStep === 2 && 'Customer Contact Details'}
                  {currentStep === 3 && 'Select Pickup & Destination on Google Maps'}
                  {currentStep === 4 && 'Date, Time & Duration'}
                  {currentStep === 5 && 'Instructions & Preference'}
                  {currentStep === 6 && 'Review Fare & Confirm'}
                  {currentStep === 7 && (isAssistantAssignedLive ? 'Assistant Assigned' : 'Booking Request Sent')}
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
                      placeholder="Enter your full name"
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
                        placeholder="10-digit mobile number"
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

                {/* Custom Address / Interactive Real Google Map with Pickup & Destination */}
                {(selectedAddressType === 'CUSTOM' || selectedAddressType === 'CURRENT' || !customerProfile?.savedAddresses?.length) && (
                  <div className="space-y-3">
                    <LocationPickerMap
                      initialLat={customLat}
                      initialLng={customLng}
                      initialAddress={customAddress}
                      initialArea={customArea}
                      height="260px"
                      showDestinationInput={true}
                      destinationLocation={destinationData}
                      onDestinationSelect={(dest, route) => {
                        setDestinationData(dest);
                        setRouteSummary(route || null);
                      }}
                      onLocationSelect={(loc) => {
                        setCustomLat(loc.lat);
                        setCustomLng(loc.lng);
                        setCustomAddress(loc.address);
                        setCustomArea(loc.area);
                        setCustomPlaceId(loc.placeId);
                      }}
                    />

                    <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#14213D] mb-1">Pickup Address / Building / Door Details</label>
                        <input
                          type="text"
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          placeholder="Search above on Google Maps or enter building/flat details"
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
                            placeholder="Nearby landmark"
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#14213D] mb-1">Selected Area</label>
                          <input
                            type="text"
                            value={customArea}
                            onChange={(e) => setCustomArea(e.target.value)}
                            placeholder="Area in Mumbai"
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[44px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Preferred Helper Request Section */}
                <div className="pt-3 border-t border-gray-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#F42F73] fill-[#F42F73]" />
                      <span>Request a Preferred Helper (Optional)</span>
                    </label>
                    {selectedAssistant && (
                      <button
                        type="button"
                        onClick={() => setSelectedAssistant(null)}
                        className="text-[11px] text-gray-500 hover:text-rose-600 font-semibold cursor-pointer"
                      >
                        Reset to any helper
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Request one of your saved favorite helpers for this errand, or choose fastest matching across Mumbai.
                  </p>

                  <div className="space-y-2">
                    {/* Fast Match Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedAssistant(null)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between min-h-[46px] ${
                        !selectedAssistant
                          ? 'border-[#F42F73] bg-[#FFF0F5]/80 ring-1 ring-[#F42F73]/50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            !selectedAssistant ? 'bg-[#F42F73] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#14213D]">
                            ⚡ Fastest Match (Any Police-Verified Assistant)
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Nearby verified helper typically assigned within ~8 minutes
                          </div>
                        </div>
                      </div>
                      {!selectedAssistant && (
                        <Check className="w-4 h-4 text-[#F42F73] shrink-0 font-bold" />
                      )}
                    </button>

                    {/* Saved Favorite Assistants Options */}
                    {MOCK_ASSISTANTS.filter((a) => favoriteAssistantIds.includes(a.id)).map((asst) => {
                      const isSelected = selectedAssistant?.id === asst.id;
                      return (
                        <button
                          key={asst.id}
                          type="button"
                          onClick={() => setSelectedAssistant(asst)}
                          className={`w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between min-h-[50px] ${
                            isSelected
                              ? 'border-[#F42F73] bg-[#FFF0F5]/80 ring-1 ring-[#F42F73]'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={asst.photo}
                                alt={asst.name}
                                className="w-10 h-10 rounded-xl object-cover border border-emerald-400"
                              />
                              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#14213D] truncate">{asst.name}</span>
                                <span className="text-[10px] bg-rose-50 text-[#F42F73] border border-rose-200 px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                                  <Heart className="w-2.5 h-2.5 fill-[#F42F73]" />
                                  <span>Saved Helper</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                                <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {asst.rating}
                                </span>
                                <span>•</span>
                                <span>{asst.completedTasksCount}+ tasks</span>
                                <span>•</span>
                                <span>{asst.serviceArea.slice(0, 2).join(', ')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isSelected ? (
                              <span className="w-6 h-6 rounded-full bg-[#F42F73] text-white flex items-center justify-center text-xs font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-600">
                                Select
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedAssistant && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>{selectedAssistant.name}</strong> will receive priority dispatch for this booking.
                      </span>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Assigned Helper</span>
                    <span className="font-semibold text-[#14213D]">
                      {selectedAssistant ? (
                        <span className="text-[#F42F73] font-bold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-[#F42F73]" />
                          <span>{selectedAssistant.name} (Preferred)</span>
                        </span>
                      ) : (
                        '⚡ Fastest Match (Verified Assistant)'
                      )}
                    </span>
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

            {/* ======================================================== */}
            {/* STEP 7: REAL-TIME BOOKING CONFIRMATION & ASSISTANT ASSIGNED */}
            {/* ======================================================== */}
            {currentStep === 7 && (
              <div className="space-y-5 py-2">
                {!isAssistantAssignedLive ? (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                      <Sparkles className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#14213D]">Booking Request Sent</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Your request has been sent to available assistants.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#14213D]">Assistant Assigned</h3>
                    <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                      Your Diblo assistant has accepted your request!
                    </p>
                  </div>
                )}

                {/* Assistant Details Card when Accepted */}
                {isAssistantAssignedLive && liveCreatedBooking && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5">
                    <img
                      src={
                        liveCreatedBooking.assistantPhoto ||
                        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80'
                      }
                      alt={liveCreatedBooking.assistantName || 'Assistant'}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        Assigned Diblo Assistant
                      </div>
                      <div className="text-sm sm:text-base font-black text-[#14213D] truncate">
                        {liveCreatedBooking.assistantName || 'Rajesh Sharma'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {liveCreatedBooking.assistantRating || 4.95}
                        </span>
                        {liveCreatedBooking.assistantPhone && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-semibold">+91 {liveCreatedBooking.assistantPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Summary Details */}
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Request ID</span>
                    <span className="font-mono font-black text-[#14213D]">
                      {liveCreatedBooking?.bookingNumber || liveCreatedBooking?.requestId || createdBookingId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Service</span>
                    <span className="font-bold text-[#14213D]">
                      {liveCreatedBooking?.serviceName || selectedService.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Date</span>
                    <span className="font-semibold text-[#14213D]">
                      {liveCreatedBooking?.scheduledDate || customDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium">Time</span>
                    <span className="font-semibold text-[#14213D]">
                      {liveCreatedBooking?.startTime || startTime}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-medium shrink-0">Pickup</span>
                    <span className="font-semibold text-[#14213D] text-right">
                      {liveCreatedBooking?.location?.address || customAddress}
                    </span>
                  </div>
                  {(liveCreatedBooking?.destinationLocation?.address || destinationData?.address) && (
                    <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
                      <span className="text-gray-500 font-medium shrink-0">Destination</span>
                      <span className="font-semibold text-[#14213D] text-right">
                        {liveCreatedBooking?.destinationLocation?.address || destinationData?.address}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-500 font-medium">Status</span>
                    {!isAssistantAssignedLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        Finding an assistant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Assistant Assigned
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onBookingSuccess(createdBookingId);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-black text-xs sm:text-sm shadow-lg shadow-[#F42F73]/25 flex items-center justify-center gap-2 transition-all min-h-[48px]"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{isAssistantAssignedLive ? 'Track Assistant on Live Map' : 'Open Live Request Tracker'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
          onPaymentSuccess={() => {
            setIsRazorpayOpen(false);
            setCurrentStep(7);
          }}
        />
      )}
    </>
  );
};
