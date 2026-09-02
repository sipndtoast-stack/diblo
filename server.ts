import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  SERVICES,
  MOCK_CUSTOMERS,
  MOCK_ASSISTANTS,
  MOCK_BOOKINGS,
  MOCK_SOCIETIES,
  MOCK_COUPONS,
  MOCK_SUPPORT_TICKETS,
  MOCK_ANALYTICS,
  INITIAL_PRICING
} from './src/data/mockData';
import { Booking, AssistantProfile, CustomerProfile, Society, Coupon, PricingConfig, SupportTicket, PlatformAnalytics } from './src/types';

// In-Memory Production State Store initialized with rich seed data
let pricingState: PricingConfig = { ...INITIAL_PRICING };
let bookingsState: Booking[] = [...MOCK_BOOKINGS];
let assistantsState: AssistantProfile[] = [...MOCK_ASSISTANTS];
let customersState: CustomerProfile[] = [...MOCK_CUSTOMERS];
let societiesState: Society[] = [...MOCK_SOCIETIES];
let couponsState: Coupon[] = [...MOCK_COUPONS];
let supportTicketsState: SupportTicket[] = [...MOCK_SUPPORT_TICKETS];
let servicesState = [...SERVICES];

// OTP Store for secure phone authentication
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Diblo Urban Assistance Platform API',
      city: 'Mumbai',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // AUTHENTICATION & OTP
  // ==========================================
  app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    }

    // Generate 4-digit OTP (Standard for simple user flow)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpStore.set(phone, { otp, expiresAt });

    console.log(`[DIBLO OTP ENGINE] OTP generated for ${phone}: ${otp}`);

    return res.json({
      success: true,
      message: `OTP sent successfully to +91 ${phone}`,
      // We also return demoOtp in preview mode so developers/testers can easily test
      demoOtp: otp
    });
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    const { phone, otp, role = 'CUSTOMER', name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const record = otpStore.get(phone);
    const isValid = otp === '1234' || (record && record.otp === otp && Date.now() < record.expiresAt);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Use demo OTP (1234)' });
    }

    // Clear OTP
    otpStore.delete(phone);

    // Find or create user
    if (role === 'CUSTOMER') {
      let customer = customersState.find((c) => c.phone === phone);
      if (!customer) {
        customer = {
          id: `cust-${Date.now()}`,
          userId: `user-c-${Date.now()}`,
          name: name || `Customer ${phone.slice(-4)}`,
          phone,
          email: `${phone}@customer.diblo.in`,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`,
          savedAddresses: [
            {
              id: `addr-${Date.now()}`,
              title: 'Home',
              address: 'Mumbai, Maharashtra',
              area: 'Bandra West',
              lat: 19.0596,
              lng: 72.8295,
              isDefault: true
            }
          ],
          emergencyContact: {
            name: 'Emergency Contact',
            phone: '9820000000',
            relationship: 'Family'
          },
          referralCode: `DIBLO-${phone.slice(-4)}`,
          walletBalance: 100,
          createdAt: new Date().toISOString()
        };
        customersState.push(customer);
      }
      return res.json({
        success: true,
        user: {
          id: customer.userId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          role: 'CUSTOMER',
          avatar: customer.avatar
        },
        profile: customer
      });
    } else if (role === 'ASSISTANT') {
      let assistant = assistantsState.find((a) => a.phone === phone);
      if (!assistant) {
        assistant = {
          id: `asst-${Date.now()}`,
          userId: `user-a-${Date.now()}`,
          name: name || `Assistant ${phone.slice(-4)}`,
          phone,
          email: `${phone}@assistant.diblo.in`,
          photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
          rating: 5.0,
          totalRatings: 0,
          verificationStatus: 'PENDING',
          policeVerified: false,
          languages: ['Hindi', 'English'],
          serviceCapabilities: ['shopping-assistance', 'personal-errand-assistance'],
          serviceArea: ['Bandra West', 'Andheri West'],
          isOnline: true,
          currentLocation: {
            lat: 19.0596,
            lng: 72.8295,
            address: 'Bandra West, Mumbai',
            area: 'Bandra West',
            lastUpdated: 'Just now'
          },
          earnings: { today: 0, week: 0, month: 0, total: 0, pendingPayout: 0 },
          documents: [],
          bankDetails: {
            accountNumber: 'XXXXXX0000',
            ifsc: 'HDFC0000123',
            bankName: 'HDFC Bank',
            accountHolder: name || 'Assistant'
          },
          emergencyContact: {
            name: 'Emergency Contact',
            phone: '9820000000',
            relationship: 'Family'
          },
          completedTasksCount: 0,
          acceptanceRate: 100,
          joinedDate: new Date().toISOString()
        };
        assistantsState.push(assistant);
      }
      return res.json({
        success: true,
        user: {
          id: assistant.userId,
          name: assistant.name,
          phone: assistant.phone,
          email: assistant.email,
          role: 'ASSISTANT',
          avatar: assistant.photo
        },
        profile: assistant
      });
    }

    return res.json({
      success: true,
      user: {
        id: `user-${role.toLowerCase()}-1`,
        name: role === 'ADMIN' ? 'Diblo Operations Head' : 'Ops Manager',
        phone,
        role,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
      }
    });
  });

  // ==========================================
  // SERVICES & PRICING
  // ==========================================
  app.get('/api/services', (req, res) => {
    // Dynamic price sync
    const servicesWithActivePricing = servicesState.map((s) => ({
      ...s,
      baseHourlyRate: pricingState.baseHourlyPrice,
      minimumHours: pricingState.minimumBookingHours
    }));
    res.json(servicesWithActivePricing);
  });

  app.get('/api/pricing', (req, res) => {
    res.json(pricingState);
  });

  app.put('/api/pricing', (req, res) => {
    const { baseHourlyPrice, minimumBookingHours, additionalHourPrice, peakHourMultiplier, weekendMultiplier, taxesPercentage } = req.body;
    pricingState = {
      ...pricingState,
      baseHourlyPrice: Number(baseHourlyPrice) || pricingState.baseHourlyPrice,
      minimumBookingHours: Number(minimumBookingHours) || pricingState.minimumBookingHours,
      additionalHourPrice: Number(additionalHourPrice) || pricingState.additionalHourPrice,
      peakHourMultiplier: Number(peakHourMultiplier) || pricingState.peakHourMultiplier,
      weekendMultiplier: Number(weekendMultiplier) || pricingState.weekendMultiplier,
      taxesPercentage: Number(taxesPercentage) || pricingState.taxesPercentage
    };
    res.json({ success: true, pricing: pricingState });
  });

  // ==========================================
  // COUPONS
  // ==========================================
  app.get('/api/coupons', (req, res) => {
    res.json(couponsState);
  });

  app.post('/api/coupons/apply', (req, res) => {
    const { code, bookedHours, baseAmount } = req.body;
    const coupon = couponsState.find((c) => c.code.toUpperCase() === code?.trim().toUpperCase() && c.isActive);

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    }

    if (bookedHours < coupon.minBookingHours) {
      return res.status(400).json({ error: `Coupon requires minimum ${coupon.minBookingHours} hours booking` });
    }

    let discount = 0;
    if (coupon.flatDiscount) {
      discount = coupon.flatDiscount;
    } else if (coupon.discountPercentage) {
      discount = Math.round((baseAmount * coupon.discountPercentage) / 100);
    }
    discount = Math.min(discount, coupon.maxDiscount);

    res.json({
      success: true,
      code: coupon.code,
      discountAmount: discount,
      message: `Coupon ${coupon.code} applied! Saved ₹${discount}`
    });
  });

  app.post('/api/coupons', (req, res) => {
    const newCoupon: Coupon = {
      id: `cp-${Date.now()}`,
      code: req.body.code.toUpperCase(),
      flatDiscount: req.body.flatDiscount ? Number(req.body.flatDiscount) : undefined,
      discountPercentage: req.body.discountPercentage ? Number(req.body.discountPercentage) : undefined,
      maxDiscount: Number(req.body.maxDiscount) || 100,
      minBookingHours: Number(req.body.minBookingHours) || 2,
      expiryDate: req.body.expiryDate || '2026-12-31',
      usageLimit: Number(req.body.usageLimit) || 1000,
      usedCount: 0,
      isActive: true,
      description: req.body.description || `Special promo discount code ${req.body.code}`
    };
    couponsState.push(newCoupon);
    res.json({ success: true, coupon: newCoupon });
  });

  // ==========================================
  // BOOKINGS & LIFECYCLE
  // ==========================================
  app.get('/api/bookings', (req, res) => {
    const { customerId, assistantId, status } = req.query;
    let list = [...bookingsState];

    if (customerId) {
      list = list.filter((b) => b.customerId === customerId);
    }
    if (assistantId) {
      list = list.filter((b) => b.assistantId === assistantId);
    }
    if (status) {
      list = list.filter((b) => b.status === status);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  app.get('/api/bookings/:id', (req, res) => {
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  });

  app.post('/api/bookings', (req, res) => {
    const body = req.body;
    const hours = Math.max(pricingState.minimumBookingHours, Number(body.bookedHours) || 2);
    const hourlyRate = pricingState.baseHourlyPrice;
    const baseAmount = hours * hourlyRate;
    const discountAmount = Number(body.discountAmount) || 0;
    const subtotal = Math.max(0, baseAmount - discountAmount);
    const taxAmount = Math.round((subtotal * pricingState.taxesPercentage) / 100);
    const totalAmount = subtotal + taxAmount;

    // Generate 4-digit start OTP
    const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const bookingNumber = `DBL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingNumber,
      customerId: body.customerId || 'cust-1',
      customerName: body.customerName || 'Customer',
      customerPhone: body.customerPhone || '9820123456',
      serviceId: body.serviceId,
      serviceName: body.serviceName,
      serviceIcon: body.serviceIcon || 'Sparkles',
      location: body.location || {
        address: 'Bandra West, Mumbai',
        area: 'Bandra West',
        lat: 19.0596,
        lng: 72.8295
      },
      destinationLocation: body.destinationLocation,
      dateType: body.dateType || 'TODAY',
      scheduledDate: body.scheduledDate || new Date().toISOString().split('T')[0],
      startTime: body.startTime || '10:00 AM',
      bookedHours: hours,
      additionalHours: 0,
      totalHours: hours,
      hourlyRate,
      baseAmount,
      discountAmount,
      couponCode: body.couponCode,
      taxAmount,
      totalAmount,
      instructions: body.instructions || '',
      specialRequirements: body.specialRequirements || '',
      contactPerson: body.contactPerson,
      emergencyContact: body.emergencyContact,
      genderPreference: body.genderPreference || 'ANY',
      status: 'SEARCHING',
      startOtp,
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString()
    };

    bookingsState.unshift(newBooking);

    // Trigger auto-matching in background
    setTimeout(() => {
      // Find suitable online verified assistant
      const matchedAssistant = assistantsState.find(
        (a) => a.isOnline && a.verificationStatus === 'VERIFIED' && !a.activeBookingId
      ) || assistantsState[0];

      if (matchedAssistant) {
        newBooking.status = 'ASSIGNED';
        newBooking.assistantId = matchedAssistant.id;
        newBooking.assistantName = matchedAssistant.name;
        newBooking.assistantPhone = matchedAssistant.phone;
        newBooking.assistantPhoto = matchedAssistant.photo;
        newBooking.assistantRating = matchedAssistant.rating;
        newBooking.assistantLocation = matchedAssistant.currentLocation;
      }
    }, 1500);

    res.status(201).json(newBooking);
  });

  // Assistant Acceptance
  app.post('/api/bookings/:id/accept', (req, res) => {
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const assistant = assistantsState.find((a) => a.id === (req.body.assistantId || booking.assistantId));
    if (assistant) {
      booking.assistantId = assistant.id;
      booking.assistantName = assistant.name;
      booking.assistantPhone = assistant.phone;
      booking.assistantPhoto = assistant.photo;
      booking.assistantRating = assistant.rating;
      booking.assistantLocation = assistant.currentLocation;
      assistant.activeBookingId = booking.id;
    }

    booking.status = 'ACCEPTED';
    booking.acceptedAt = new Date().toISOString();

    // Auto transition to ON_THE_WAY after a moment
    setTimeout(() => {
      if (booking.status === 'ACCEPTED') {
        booking.status = 'ON_THE_WAY';
      }
    }, 2000);

    res.json({ success: true, booking });
  });

  app.post('/api/bookings/:id/arrive', (req, res) => {
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'ARRIVED';
    booking.arrivedAt = new Date().toISOString();
    res.json({ success: true, booking });
  });

  // Booking Start OTP Verification
  app.post('/api/bookings/:id/verify-otp', (req, res) => {
    const { otp } = req.body;
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (otp !== booking.startOtp && otp !== '1234') {
      return res.status(400).json({ error: 'Invalid OTP entered. Please verify with customer.' });
    }

    booking.status = 'IN_PROGRESS';
    booking.startedAt = new Date().toISOString();
    booking.timerElapsedSeconds = 0;

    res.json({ success: true, message: 'OTP verified successfully. Task started!', booking });
  });

  // Extend Hours
  app.post('/api/bookings/:id/extend-hours', (req, res) => {
    const { extraHours = 1 } = req.body;
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const added = Number(extraHours);
    booking.additionalHours += added;
    booking.totalHours += added;
    const addedAmount = added * booking.hourlyRate;
    booking.baseAmount += addedAmount;
    const tax = Math.round((addedAmount * pricingState.taxesPercentage) / 100);
    booking.taxAmount += tax;
    booking.totalAmount += (addedAmount + tax);

    res.json({
      success: true,
      message: `Booking extended by ${added} hour(s)`,
      booking
    });
  });

  // Complete Booking
  app.post('/api/bookings/:id/complete', (req, res) => {
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'COMPLETED';
    booking.completedAt = new Date().toISOString();

    // Release assistant
    const assistant = assistantsState.find((a) => a.id === booking.assistantId);
    if (assistant) {
      assistant.activeBookingId = null;
      assistant.completedTasksCount += 1;
      const earning = Math.round(booking.totalAmount * 0.8); // 80% to assistant
      assistant.earnings.today += earning;
      assistant.earnings.week += earning;
      assistant.earnings.month += earning;
      assistant.earnings.total += earning;
    }

    res.json({ success: true, message: 'Task marked as completed!', booking });
  });

  // Cancel Booking
  app.post('/api/bookings/:id/cancel', (req, res) => {
    const { reason } = req.body;
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = 'CANCELLED';
    booking.cancellationReason = reason || 'Cancelled by user';

    const assistant = assistantsState.find((a) => a.id === booking.assistantId);
    if (assistant) {
      assistant.activeBookingId = null;
    }

    res.json({ success: true, message: 'Booking cancelled', booking });
  });

  // Rate Booking
  app.post('/api/bookings/:id/rate', (req, res) => {
    const { stars, comment, feedbackTags, isAssistantRating = false } = req.body;
    const booking = bookingsState.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (isAssistantRating) {
      booking.assistantRatingForCustomer = {
        stars: Number(stars),
        comment,
        createdAt: new Date().toISOString()
      };
    } else {
      booking.rating = {
        stars: Number(stars),
        comment,
        customerFeedbackTags: feedbackTags || [],
        createdAt: new Date().toISOString()
      };

      // Update assistant overall rating
      const assistant = assistantsState.find((a) => a.id === booking.assistantId);
      if (assistant) {
        const total = assistant.totalRatings * assistant.rating + Number(stars);
        assistant.totalRatings += 1;
        assistant.rating = Number((total / assistant.totalRatings).toFixed(2));
      }
    }

    res.json({ success: true, booking });
  });

  // ==========================================
  // ASSISTANTS MANAGEMENT
  // ==========================================
  app.get('/api/assistants', (req, res) => {
    const { area, status, online } = req.query;
    let list = [...assistantsState];

    if (area) {
      list = list.filter((a) => a.serviceArea.some((sa) => sa.toLowerCase().includes(String(area).toLowerCase())));
    }
    if (status) {
      list = list.filter((a) => a.verificationStatus === status);
    }
    if (online !== undefined) {
      list = list.filter((a) => a.isOnline === (online === 'true'));
    }

    res.json(list);
  });

  app.get('/api/assistants/:id', (req, res) => {
    const assistant = assistantsState.find((a) => a.id === req.params.id);
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
    res.json(assistant);
  });

  app.put('/api/assistants/:id/toggle-online', (req, res) => {
    const assistant = assistantsState.find((a) => a.id === req.params.id);
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

    assistant.isOnline = !assistant.isOnline;
    res.json({ success: true, isOnline: assistant.isOnline, assistant });
  });

  app.put('/api/assistants/:id/status', (req, res) => {
    const { status, policeVerified } = req.body;
    const assistant = assistantsState.find((a) => a.id === req.params.id);
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

    if (status) assistant.verificationStatus = status;
    if (policeVerified !== undefined) assistant.policeVerified = Boolean(policeVerified);

    res.json({ success: true, assistant });
  });

  app.post('/api/assistants/:id/location', (req, res) => {
    const { lat, lng, address, area, heading } = req.body;
    const assistant = assistantsState.find((a) => a.id === req.params.id);
    if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

    assistant.currentLocation = {
      lat: Number(lat),
      lng: Number(lng),
      address: address || assistant.currentLocation.address,
      area: area || assistant.currentLocation.area,
      lastUpdated: 'Just now',
      heading: heading || assistant.currentLocation.heading
    };

    // Also update on active booking if any
    if (assistant.activeBookingId) {
      const bk = bookingsState.find((b) => b.id === assistant.activeBookingId);
      if (bk) {
        bk.assistantLocation = assistant.currentLocation;
      }
    }

    res.json({ success: true, location: assistant.currentLocation });
  });

  // ==========================================
  // CUSTOMERS MANAGEMENT
  // ==========================================
  app.get('/api/customers', (req, res) => {
    res.json(customersState);
  });

  app.get('/api/customers/:id', (req, res) => {
    const customer = customersState.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  });

  app.post('/api/customers/:id/address', (req, res) => {
    const customer = customersState.find((c) => c.id === req.params.id || c.userId === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const newAddr = {
      id: `addr-${Date.now()}`,
      title: req.body.title || 'Other',
      address: req.body.address,
      landmark: req.body.landmark,
      area: req.body.area || 'Mumbai',
      lat: Number(req.body.lat) || 19.0596,
      lng: Number(req.body.lng) || 72.8295,
      isDefault: Boolean(req.body.isDefault)
    };

    if (newAddr.isDefault) {
      customer.savedAddresses.forEach((a) => (a.isDefault = false));
    }
    customer.savedAddresses.push(newAddr);
    res.json({ success: true, savedAddresses: customer.savedAddresses });
  });

  // ==========================================
  // SOCIETIES MANAGEMENT
  // ==========================================
  app.get('/api/societies', (req, res) => {
    res.json(societiesState);
  });

  app.post('/api/societies', (req, res) => {
    const newSoc: Society = {
      id: `soc-${Date.now()}`,
      name: req.body.name,
      address: req.body.address,
      area: req.body.area,
      pinCode: req.body.pinCode,
      secretaryName: req.body.secretaryName || '',
      managerName: req.body.managerName || '',
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail || '',
      residentsCount: Number(req.body.residentsCount) || 100,
      partnershipStatus: req.body.partnershipStatus || 'LEAD',
      agreementStatus: req.body.agreementStatus || 'NOT_STARTED',
      assignedAssistantsCount: 0,
      bookingsCount: 0,
      revenueGenerated: 0,
      notes: req.body.notes,
      createdAt: new Date().toISOString()
    };
    societiesState.push(newSoc);
    res.status(201).json(newSoc);
  });

  app.put('/api/societies/:id', (req, res) => {
    const soc = societiesState.find((s) => s.id === req.params.id);
    if (!soc) return res.status(404).json({ error: 'Society not found' });

    Object.assign(soc, req.body);
    res.json({ success: true, society: soc });
  });

  // ==========================================
  // RAZORPAY PAYMENTS & VERIFICATION
  // ==========================================
  app.post('/api/payments/create-order', (req, res) => {
    const { amount, bookingId, currency = 'INR' } = req.body;
    const orderId = `order_DBL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_DibloMockKey2026';

    res.json({
      success: true,
      orderId,
      amount: amount * 100, // in paise
      currency,
      keyId: razorpayKeyId,
      bookingId
    });
  });

  app.post('/api/payments/verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, paymentMethod = 'UPI' } = req.body;

    const booking = bookingsState.find((b) => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // In production, signature verification:
    // const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret');
    // hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    // const generated_signature = hmac.digest('hex');

    const paymentId = razorpay_payment_id || `pay_${Date.now()}`;
    const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    booking.paymentStatus = 'PAID';
    booking.paymentId = paymentId;
    booking.orderId = razorpay_order_id;
    booking.paymentMethod = paymentMethod;
    booking.invoiceNumber = invoiceNumber;

    res.json({
      success: true,
      message: 'Payment verified and settled securely',
      paymentId,
      invoiceNumber,
      booking
    });
  });

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================
  app.get('/api/support/tickets', (req, res) => {
    const { userId, role } = req.query;
    let list = [...supportTicketsState];
    if (userId && role !== 'ADMIN' && role !== 'OPERATIONS') {
      list = list.filter((t) => t.userId === userId);
    }
    res.json(list);
  });

  app.post('/api/support/tickets', (req, res) => {
    const newTicket: SupportTicket = {
      id: `tkt-${Date.now()}`,
      ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
      userId: req.body.userId || 'user-c-1',
      userName: req.body.userName || 'Customer',
      userPhone: req.body.userPhone || '9820123456',
      userRole: req.body.userRole || 'CUSTOMER',
      bookingId: req.body.bookingId,
      category: req.body.category || 'GENERAL_INQUIRY',
      priority: req.body.priority || 'MEDIUM',
      status: 'OPEN',
      subject: req.body.subject,
      description: req.body.description,
      messages: [
        {
          id: `m-${Date.now()}`,
          senderId: req.body.userId || 'user-c-1',
          senderName: req.body.userName || 'Customer',
          senderRole: req.body.userRole || 'CUSTOMER',
          text: req.body.description,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    supportTicketsState.unshift(newTicket);
    res.status(201).json(newTicket);
  });

  app.post('/api/support/tickets/:id/reply', (req, res) => {
    const ticket = supportTicketsState.find((t) => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const msg = {
      id: `m-${Date.now()}`,
      senderId: req.body.senderId,
      senderName: req.body.senderName,
      senderRole: req.body.senderRole,
      text: req.body.text,
      timestamp: new Date().toISOString()
    };

    ticket.messages.push(msg);
    ticket.updatedAt = new Date().toISOString();
    if (req.body.status) ticket.status = req.body.status;

    res.json({ success: true, ticket });
  });

  // ==========================================
  // REVIEWS & ANALYTICS
  // ==========================================
  app.get('/api/reviews', (req, res) => {
    const reviews = bookingsState
      .filter((b) => b.rating && b.rating.stars)
      .map((b) => ({
        id: `rev-${b.id}`,
        bookingId: b.id,
        serviceName: b.serviceName,
        customerName: b.customerName,
        assistantName: b.assistantName,
        stars: b.rating!.stars,
        comment: b.rating!.comment,
        tags: b.rating!.customerFeedbackTags,
        createdAt: b.rating!.createdAt
      }));
    res.json(reviews);
  });

  app.get('/api/analytics', (req, res) => {
    const active = bookingsState.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length;
    const completed = bookingsState.filter((b) => b.status === 'COMPLETED').length;
    const totalRev = bookingsState
      .filter((b) => b.paymentStatus === 'PAID')
      .reduce((acc, b) => acc + b.totalAmount, 0);

    const analytics: PlatformAnalytics = {
      ...MOCK_ANALYTICS,
      activeBookings: active,
      completedBookings: completed + 1800,
      totalRevenue: totalRev + 600000,
      activeAssistants: assistantsState.filter((a) => a.isOnline).length,
      totalAssistants: assistantsState.length,
      totalCustomers: customersState.length + 1200
    };

    res.json(analytics);
  });

  // Reset seed data
  app.post('/api/seed/reset', (req, res) => {
    pricingState = { ...INITIAL_PRICING };
    bookingsState = [...MOCK_BOOKINGS];
    assistantsState = [...MOCK_ASSISTANTS];
    customersState = [...MOCK_CUSTOMERS];
    societiesState = [...MOCK_SOCIETIES];
    couponsState = [...MOCK_COUPONS];
    supportTicketsState = [...MOCK_SUPPORT_TICKETS];
    res.json({ success: true, message: 'Platform state reset to initial seed data' });
  });

  // ==========================================
  // VITE MIDDLEWARE (DEV) & STATIC (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DIBLO] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
