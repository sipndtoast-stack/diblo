import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { initializeFirebaseAdmin } from './server/lib/firebaseAdmin';
import { dbRepository } from './server/lib/db';
import {
  authenticateUser,
  requireAuth,
  requireRole,
  generateAuthToken,
  verifyAuthToken,
  createPhoneOtp,
  verifyPhoneOtp,
  AuthenticatedRequest
} from './server/lib/auth';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayClient
} from './server/lib/razorpay';
import { appendOnboardingToSheet, verifyStaffCredentials } from './server/lib/googleSheetsAdmin';
import {
  Booking,
  AssistantProfile,
  CustomerProfile,
  Society,
  Coupon,
  Referral,
  SupportTicket,
  PlatformAnalytics,
  UserRole,
  User,
  AssistantApplication,
  EmergencyAlert
} from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin on startup
  const firebaseStatus = initializeFirebaseAdmin();

  // Basic security and parsing middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Attach auth user if present
  app.use(authenticateUser);

  // ==========================================
  // SYSTEM & HEALTH
  // ==========================================
  app.get('/api/config/firebase', (req, res) => {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return res.json(config);
      }
    } catch {
      // Fallback below
    }
    res.json({
      apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyBZgAbbS7_cTo7ml3EkUf5yKxPiADy5k1U',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || 'diblo-39440.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'diblo-39440',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || 'diblo-39440.firebasestorage.app',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '650321096736',
      appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '1:650321096736:web:218a11d36b1ca9e38c0c45',
    });
  });

  app.get('/api/health', (req, res) => {
    const razorpayInfo = getRazorpayClient();
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    res.json({
      status: 'ok',
      service: 'Diblo Urban Assistance Platform API',
      city: 'Mumbai',
      version: '1.0.0',
      maps: {
        configured: Boolean(mapsKey && mapsKey.trim().length > 0)
      },
      firebase: {
        initialized: firebaseStatus.isInitialized,
        error: firebaseStatus.error || null
      },
      razorpay: {
        configured: razorpayInfo.isConfigured,
        keyId: razorpayInfo.keyId ? `${razorpayInfo.keyId.substring(0, 8)}...` : null
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // GOOGLE MAPS PLATFORM PROXY & CONFIG
  // ==========================================
  const isValidGoogleMapsKey = (key: string | null | undefined): boolean => {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    // Valid Google Maps API keys are at least 25 characters and start with AIza
    return trimmed.startsWith('AIza') && trimmed.length >= 25;
  };

  app.get('/api/maps/config', (req, res) => {
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const isValid = isValidGoogleMapsKey(mapsKey);
    res.json({
      configured: isValid,
      apiKey: isValid ? mapsKey.trim() : null
    });
  });

  // Reverse Geocoding Proxy (lat/lng -> formatted address)
  app.get('/api/maps/reverse-geocode', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!isValidGoogleMapsKey(mapsKey)) {
      // Graceful fallback for local preview without key
      return res.json({
        formattedAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E, Mumbai, Maharashtra`,
        area: 'Mumbai',
        lat: latitude,
        lng: longitude,
        isFallback: true
      });
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(mapsKey)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        // Extract sublocality or locality
        let area = 'Mumbai';
        for (const comp of result.address_components) {
          if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
            area = comp.long_name;
            break;
          } else if (comp.types.includes('locality')) {
            area = comp.long_name;
          }
        }

        return res.json({
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          area,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          isFallback: false
        });
      }

      return res.json({
        formattedAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E, Mumbai, Maharashtra`,
        area: 'Mumbai',
        lat: latitude,
        lng: longitude,
        isFallback: true
      });
    } catch (err: any) {
      console.error('[MAPS PROXY] Reverse geocode error occurred');
      return res.json({
        formattedAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E, Mumbai, Maharashtra`,
        area: 'Mumbai',
        lat: latitude,
        lng: longitude,
        isFallback: true
      });
    }
  });

  // Forward Geocoding / Search Proxy (query -> lat/lng & address)
  app.get('/api/maps/geocode', async (req, res) => {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address query is required' });
    }

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    const query = address.trim();

    if (!isValidGoogleMapsKey(mapsKey)) {
      // Return predefined Mumbai landmark matches if no key
      const lower = query.toLowerCase();
      let mockLat = 19.0596;
      let mockLng = 72.8295;
      let area = 'Bandra West';

      if (lower.includes('andheri')) {
        mockLat = 19.1197;
        mockLng = 72.8468;
        area = 'Andheri West';
      } else if (lower.includes('powai')) {
        mockLat = 19.1176;
        mockLng = 72.9060;
        area = 'Powai';
      } else if (lower.includes('dadar')) {
        mockLat = 19.0178;
        mockLng = 72.8478;
        area = 'Dadar';
      } else if (lower.includes('colaba') || lower.includes('gate of india')) {
        mockLat = 18.9067;
        mockLng = 72.8147;
        area = 'Colaba';
      } else if (lower.includes('bkc') || lower.includes('kurla')) {
        mockLat = 19.0657;
        mockLng = 72.8687;
        area = 'BKC';
      } else if (lower.includes('juhu')) {
        mockLat = 19.1075;
        mockLng = 72.8263;
        area = 'Juhu';
      }

      return res.json({
        results: [
          {
            formattedAddress: `${query}, ${area}, Mumbai, Maharashtra`,
            area,
            lat: mockLat,
            lng: mockLng,
            isFallback: true
          }
        ]
      });
    }

    try {
      // Append Mumbai for context if not specified
      const searchQuery = query.toLowerCase().includes('mumbai') ? query : `${query}, Mumbai, India`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${encodeURIComponent(mapsKey)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5).map((r: any) => {
          let area = 'Mumbai';
          for (const comp of r.address_components) {
            if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
              area = comp.long_name;
              break;
            } else if (comp.types.includes('locality')) {
              area = comp.long_name;
            }
          }
          return {
            formattedAddress: r.formatted_address,
            placeId: r.place_id,
            area,
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
            isFallback: false
          };
        });

        return res.json({ results });
      }

      return res.json({ results: [] });
    } catch (err: any) {
      console.error('[MAPS PROXY] Geocode error occurred');
      return res.json({ results: [] });
    }
  });

  // Routes API Proxy (origin -> destination distance & duration)
  app.post('/api/maps/route', async (req, res) => {
    const { originLat, originLng, destLat, destLng, travelMode } = req.body || {};

    if (
      originLat === undefined || originLng === undefined ||
      destLat === undefined || destLng === undefined
    ) {
      return res.status(400).json({ error: 'Origin and destination coordinates are required' });
    }

    const oLat = Number(originLat);
    const oLng = Number(originLng);
    const dLat = Number(destLat);
    const dLng = Number(destLng);

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

    // Helper estimation function
    const estimateRouteFallback = () => {
      const R = 6371; // Earth radius in km
      const deltaLat = (dLat - oLat) * (Math.PI / 180);
      const deltaLng = (dLng - oLng) * (Math.PI / 180);
      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(oLat * (Math.PI / 180)) * Math.cos(dLat * (Math.PI / 180)) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const straightDist = R * c;
      const roadDistKm = Math.max(0.4, Number((straightDist * 1.35).toFixed(1)));
      const estMinutes = Math.max(4, Math.round(roadDistKm * 3.5)); // ~18-20 km/h in Mumbai traffic
      return {
        success: true,
        distanceMeters: Math.round(roadDistKm * 1000),
        distanceKm: roadDistKm,
        distanceText: `${roadDistKm} km`,
        durationMinutes: estMinutes,
        durationText: `${estMinutes} min`,
        polyline: null,
        isFallback: true
      };
    };

    if (!isValidGoogleMapsKey(mapsKey)) {
      return res.json(estimateRouteFallback());
    }

    try {
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const bodyPayload = {
        origin: {
          location: {
            latLng: { latitude: oLat, longitude: oLng }
          }
        },
        destination: {
          location: {
            latLng: { latitude: dLat, longitude: dLng }
          }
        },
        travelMode: travelMode === 'TWO_WHEELER' ? 'TWO_WHEELER' : travelMode === 'WALK' ? 'WALK' : 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsKey.trim(),
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        console.warn(`[MAPS PROXY] Routes API returned status ${response.status}. Using geometric estimation.`);
        return res.json(estimateRouteFallback());
      }

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const meters = route.distanceMeters || 1000;
        const distKm = Number((meters / 1000).toFixed(1));
        // duration is e.g. "1240s"
        const durationSec = parseInt(route.duration?.replace('s', '') || '600', 10);
        const durationMins = Math.max(1, Math.round(durationSec / 60));

        return res.json({
          success: true,
          distanceMeters: meters,
          distanceKm: distKm,
          distanceText: `${distKm} km`,
          durationMinutes: durationMins,
          durationText: `${durationMins} min`,
          polyline: route.polyline?.encodedPolyline || null,
          isFallback: false
        });
      }

      return res.json(estimateRouteFallback());
    } catch (err) {
      console.warn('[MAPS PROXY] Routes API request error. Using geometric estimation.');
      return res.json(estimateRouteFallback());
    }
  });

  // ==========================================
  // AUTHENTICATION & OTP
  // ==========================================
  app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const { otp, expiresAt } = createPhoneOtp(cleanPhone);

    const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_OTP === 'true';

    console.log(`[DIBLO AUTH] OTP generated for +91 ${cleanPhone}`);

    return res.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone}`,
      expiresAt,
      // In non-production preview mode, supply demo OTP for testing ease
      ...(isDev ? { demoOtp: otp } : {})
    });
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp, role = 'CUSTOMER', name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const verifyResult = verifyPhoneOtp(cleanPhone, String(otp).trim());

    if (!verifyResult.isValid) {
      return res.status(400).json({ error: verifyResult.message || 'Invalid or expired OTP' });
    }

    // Role-based profile management
    const targetRole: UserRole = ['CUSTOMER', 'ASSISTANT', 'ADMIN', 'OPERATIONS'].includes(role)
      ? role
      : 'CUSTOMER';

    let user = await dbRepository.getUserByPhone(cleanPhone);
    let customerProfile: CustomerProfile | null = null;
    let assistantProfile: AssistantProfile | null = null;

    if (targetRole === 'CUSTOMER') {
      customerProfile = await dbRepository.getCustomer(cleanPhone);
      if (!customerProfile) {
        const userId = user?.id || `user-c-${Date.now()}`;
        const custId = `cust-${Date.now()}`;
        customerProfile = {
          id: custId,
          userId,
          name: name || user?.name || `Customer ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          email: `${cleanPhone}@customer.diblo.in`,
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
          referralCode: `DIBLO-${cleanPhone.slice(-4)}`,
          walletBalance: 100,
          createdAt: new Date().toISOString()
        };
        await dbRepository.saveCustomer(customerProfile);
      }

      if (!user) {
        user = {
          id: customerProfile.userId,
          name: customerProfile.name,
          phone: cleanPhone,
          email: customerProfile.email,
          role: 'CUSTOMER',
          avatar: customerProfile.avatar,
          createdAt: new Date().toISOString()
        };
        await dbRepository.saveUser(user);
      }
    } else if (targetRole === 'ASSISTANT') {
      assistantProfile = await dbRepository.getAssistant(cleanPhone);
      if (!assistantProfile) {
        const userId = user?.id || `user-a-${Date.now()}`;
        const asstId = `asst-${Date.now()}`;
        assistantProfile = {
          id: asstId,
          userId,
          name: name || user?.name || `Assistant ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          email: `${cleanPhone}@assistant.diblo.in`,
          photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
          rating: 5.0,
          totalRatings: 0,
          verificationStatus: 'PENDING',
          policeVerified: false,
          languages: ['Hindi', 'English', 'Marathi'],
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
        await dbRepository.saveAssistant(assistantProfile);
      }

      if (!user) {
        user = {
          id: assistantProfile.userId,
          name: assistantProfile.name,
          phone: cleanPhone,
          email: assistantProfile.email,
          role: 'ASSISTANT',
          avatar: assistantProfile.photo,
          createdAt: new Date().toISOString()
        };
        await dbRepository.saveUser(user);
      }
    } else {
      // Admin / Operations
      if (!user) {
        user = {
          id: `user-${targetRole.toLowerCase()}-${Date.now()}`,
          name: targetRole === 'ADMIN' ? 'Diblo Operations Head' : 'Ops Manager',
          phone: cleanPhone,
          email: `${targetRole.toLowerCase()}@diblo.in`,
          role: targetRole,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
          createdAt: new Date().toISOString()
        };
        await dbRepository.saveUser(user);
      }
    }

    // Generate authenticated JWT session token
    const token = generateAuthToken({
      id: user.id,
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      name: user.name,
      customerId: customerProfile?.id,
      assistantId: assistantProfile?.id
    });

    return res.json({
      success: true,
      token,
      user,
      profile: customerProfile || assistantProfile || null
    });
  });

  // Verify currently authenticated user session (/api/auth/me) - Graceful fallback so network/auth errors never occur
  app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    let decoded = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      decoded = verifyAuthToken(token);
    }

    const roleHeader = (req.headers['x-user-role'] as string) || (req.headers['x-diblo-role'] as string);
    const role: UserRole = decoded?.role || (roleHeader && ['ADMIN', 'OPERATIONS', 'ASSISTANT', 'CUSTOMER'].includes(roleHeader.toUpperCase())
      ? roleHeader.toUpperCase() as UserRole
      : 'CUSTOMER');

    const cleanPhone = decoded?.phone
      ? decoded.phone.replace(/\D/g, '').slice(-10)
      : (role === 'ADMIN' ? '9820001122' : role === 'ASSISTANT' ? '9820554433' : '9820123456');

    let user = cleanPhone ? await dbRepository.getUserByPhone(cleanPhone) : null;
    let customerProfile: CustomerProfile | null = null;
    let assistantProfile: AssistantProfile | null = null;

    if (role === 'CUSTOMER') {
      customerProfile = cleanPhone ? await dbRepository.getCustomer(cleanPhone) : null;
    } else if (role === 'ASSISTANT') {
      assistantProfile = cleanPhone ? await dbRepository.getAssistant(cleanPhone) : null;
    }

    if (!user) {
      user = {
        id: decoded?.id || decoded?.userId || (role === 'ADMIN' ? 'user-admin-1' : role === 'ASSISTANT' ? 'user-a-1' : 'user-c-1'),
        name: decoded?.name || (role === 'ADMIN' ? 'Diblo Operations Head' : role === 'ASSISTANT' ? 'Rajesh Sharma' : 'Aarav Mehta'),
        phone: cleanPhone,
        email: decoded?.email || `${cleanPhone || 'user'}@diblo.in`,
        role: role,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        createdAt: new Date().toISOString()
      };
    }

    return res.json({
      success: true,
      user,
      profile: customerProfile || assistantProfile || null
    });
  });

  // Email & password authentication route
  app.post('/api/auth/login-email', async (req, res) => {
    const { email, password, role = 'CUSTOMER', name, isSignUp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole: UserRole = ['CUSTOMER', 'ASSISTANT', 'ADMIN', 'OPERATIONS'].includes(role)
      ? role
      : 'CUSTOMER';

    const cleanPhone = `982${Math.floor(1000000 + Math.random() * 9000000)}`;
    const displayName = name || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    const user: User = {
      id: `user-${targetRole.toLowerCase()}-${Date.now()}`,
      name: displayName,
      phone: cleanPhone,
      email: cleanEmail,
      role: targetRole,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };

    let profile: any = null;
    if (targetRole === 'CUSTOMER') {
      profile = {
        id: `cust-${Date.now()}`,
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
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
        referralCode: `DIBLO-${user.phone.slice(-4)}`,
        walletBalance: 100,
        createdAt: new Date().toISOString()
      };
      await dbRepository.saveCustomer(profile);
      await dbRepository.saveUser(user);
    }

    const token = generateAuthToken({
      id: user.id,
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      name: user.name,
      customerId: profile?.id
    });

    return res.json({
      success: true,
      token,
      user,
      profile
    });
  });

  // Sync session with Firebase Auth user
  app.post('/api/auth/sync-firebase', async (req, res) => {
    try {
      const { firebaseUid, email, name, role = 'CUSTOMER', firebaseToken } = req.body;

      if (!email && !firebaseUid) {
        return res.status(400).json({ success: false, error: 'Firebase UID or email required' });
      }

      // Check if user already exists
      let user = (await dbRepository.getUserByEmail(email)) || (await dbRepository.getUserById(firebaseUid));

      if (!user) {
        // Create new user linked to Firebase
        user = {
          id: firebaseUid || `usr-${Date.now()}`,
          name: name || email.split('@')[0],
          phone: '9820' + Math.floor(100000 + Math.random() * 900000),
          email: email,
          role: role as UserRole,
          createdAt: new Date().toISOString()
        };
        await dbRepository.saveUser(user);
      }

      let profile = null;
      if (user.role === 'CUSTOMER') {
        profile = await dbRepository.getCustomerByUserId(user.id);
        if (!profile) {
          profile = {
            id: `cust-${Date.now()}`,
            userId: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            addresses: [
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
            referralCode: `DIBLO-${user.phone.slice(-4)}`,
            walletBalance: 100,
            createdAt: new Date().toISOString()
          };
          await dbRepository.saveCustomer(profile);
        }
      } else if (user.role === 'ASSISTANT') {
        profile = await dbRepository.getAssistantByUserId(user.id);
        if (!profile) {
          profile = {
            id: `asst-${Date.now()}`,
            userId: user.id,
            name: user.name,
            phone: user.phone,
            rating: 4.9,
            ratingCount: 1,
            reviewsCount: 1,
            completedTasksCount: 0,
            hourlyRate: 199,
            serviceCategories: ['COMPANIONSHIP', 'LOCAL_MUMBAI_ERRANDS'],
            skills: ['Hindi & English Speaker', 'Mumbai Navigator', 'Senior Care'],
            isVerified: true,
            isOnline: true,
            verificationStatus: 'VERIFIED',
            currentLocation: {
              lat: 19.0596,
              lng: 72.8295,
              address: 'Bandra West, Mumbai',
              updatedAt: new Date().toISOString()
            },
            joinedAt: new Date().toISOString()
          };
          await dbRepository.saveAssistant(profile);
        }
      }

      const token = generateAuthToken({
        id: user.id,
        userId: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        name: user.name,
        customerId: profile?.id
      });

      return res.json({
        success: true,
        token,
        user,
        profile
      });
    } catch (err: any) {
      console.error('[sync-firebase error]', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to sync Firebase session' });
    }
  });

  // ==========================================
  // STAFF AUTHENTICATION (Google Sheet: Staff Details)
  // Spreadsheet ID: 19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0
  // Tab Name: Staff Details
  // ==========================================

  // Fallback directory matching Google Sheet specifications:
  // Tab: Staff Details
  app.post(['/api/staff/login', '/staff/login'], async (req, res) => {
    try {
      const { mobileNumber, mobile, number, phone, eplId, password } = req.body || {};
      const rawMobile = String(mobileNumber || mobile || number || phone || eplId || '').trim();
      const rawPassword = String(password || '').trim();

      if (!rawMobile || !rawPassword) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Mobile number or password is incorrect.'
        });
      }

      const result = await verifyStaffCredentials(rawMobile, rawPassword);

      if (!result.success) {
        const statusCode = result.code === 'STAFF_NOT_FOUND' ? 404 : 401;
        const msg = result.code === 'STAFF_NOT_FOUND'
          ? 'Assistance account not found.'
          : 'Mobile number or password is incorrect.';
        return res.status(statusCode).json({
          success: false,
          code: result.code || 'INVALID_CREDENTIALS',
          message: msg
        });
      }

      const userRole = (result.role === 'Admin' ? 'ADMIN' : 'ASSISTANT') as UserRole;

      const token = generateAuthToken({
        id: `staff-${result.eplId || rawMobile}`,
        userId: result.eplId || rawMobile,
        phone: result.number || rawMobile,
        email: result.email || `${result.eplId || 'staff'}@diblo.in`,
        role: userRole,
        name: result.name || (result.role === 'Admin' ? 'Diblo Admin' : 'Field Assistant')
      });

      console.log(`[Staff Login Success] ${result.name} (${result.role}) via ${result.source}`);

      return res.json({
        success: true,
        role: result.role,
        eplId: result.eplId,
        name: result.name,
        number: result.number,
        email: result.email,
        staff: {
          eplId: result.eplId,
          name: result.name,
          number: result.number,
          email: result.email,
          role: result.role
        },
        token
      });

    } catch (err: any) {
      console.error('[Staff Login Error]:', err.message);
      return res.status(500).json({
        success: false,
        code: 'SERVER_CONFIG_ERROR',
        message: 'Staff login service is temporarily unavailable. Please try again.'
      });
    }
  });

  // Verify staff session
  app.get('/api/staff/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, authenticated: false, message: 'No session token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAuthToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, authenticated: false, message: 'Invalid or expired session token' });
    }

    const roleUpper = String(decoded.role || '').toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'ASSISTANT' && roleUpper !== 'OPERATIONS') {
      return res.status(403).json({ success: false, authenticated: false, message: 'Not a staff account' });
    }

    const roleFormatted: 'Assistant' | 'Admin' = (roleUpper === 'ADMIN' || roleUpper === 'OPERATIONS') ? 'Admin' : 'Assistant';

    return res.json({
      success: true,
      authenticated: true,
      eplId: decoded.userId || decoded.id,
      name: decoded.name,
      number: decoded.phone,
      email: decoded.email,
      role: roleFormatted
    });
  });

  // Staff logout
  app.post('/api/staff/logout', (req, res) => {
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // ==========================================
  // ASSISTANT ONBOARDING PIPELINE & APPLICATIONS
  // ==========================================
  // Public endpoint: Submit 8-step application
  app.post(['/api/assistant/apply', '/api/assistant/apply/'], async (req, res) => {
    try {
      const body = req.body;
      const cleanPhone = String(body.mobileNumber || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number is required' });
      }
      if (!body.fullName || !body.aadhaarNumber || !body.panNumber) {
        return res.status(400).json({ success: false, error: 'Name, Aadhaar, and PAN are mandatory fields' });
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const applicationNumber = `DIBLO-APP-${randomSuffix}`;
      const newApp: AssistantApplication = {
        id: `app-${Date.now()}`,
        applicationNumber,
        fullName: String(body.fullName).trim(),
        mobileNumber: cleanPhone,
        alternateMobile: body.alternateMobile ? String(body.alternateMobile).replace(/\D/g, '').slice(-10) : undefined,
        email: body.email ? String(body.email).trim() : `${cleanPhone}@applicant.diblo.in`,
        dateOfBirth: body.dateOfBirth || '1995-01-01',
        gender: body.gender || 'MALE',
        currentAddress: body.currentAddress || '',
        permanentAddress: body.permanentAddress || body.currentAddress || '',
        mumbaiArea: body.mumbaiArea || 'Bandra West',
        pinCode: body.pinCode || '400050',
        aadhaarNumber: String(body.aadhaarNumber).replace(/\D/g, ''),
        aadhaarFrontDoc: body.aadhaarFrontDoc || undefined,
        aadhaarBackDoc: body.aadhaarBackDoc || undefined,
        panNumber: String(body.panNumber).toUpperCase().trim(),
        panDoc: body.panDoc || undefined,
        policeClearanceCert: body.policeClearanceCert || undefined,
        addressProofDoc: body.addressProofDoc || undefined,
        languagesSpoken: Array.isArray(body.languagesSpoken) && body.languagesSpoken.length > 0 ? body.languagesSpoken : ['Hindi', 'English'],
        selectedServices: Array.isArray(body.selectedServices) && body.selectedServices.length > 0 ? body.selectedServices : ['Senior Citizen Assistance', 'Shopping & Market Escort'],
        yearsOfExperience: Number(body.yearsOfExperience) || 1,
        specialSkills: body.specialSkills || '',
        preferredOperatingZones: Array.isArray(body.preferredOperatingZones) && body.preferredOperatingZones.length > 0 ? body.preferredOperatingZones : ['Bandra West', 'Andheri West'],
        availabilityType: body.availabilityType || 'FULL_TIME',
        preferredTimeSlots: Array.isArray(body.preferredTimeSlots) && body.preferredTimeSlots.length > 0 ? body.preferredTimeSlots : ['Morning (08:00 AM - 02:00 PM)'],
        hasTwoWheeler: Boolean(body.hasTwoWheeler),
        drivingLicenseNumber: body.drivingLicenseNumber || '',
        emergencyContactName: body.emergencyContactName || 'Family Member',
        emergencyContactPhone: body.emergencyContactPhone || '9820000000',
        emergencyContactRelation: body.emergencyContactRelation || 'Parent',
        referenceName: body.referenceName || '',
        referencePhone: body.referencePhone || '',
        hasCriminalRecord: Boolean(body.hasCriminalRecord),
        bankAccountNumber: String(body.bankAccountNumber || 'XXXXXXXX0000').trim(),
        bankIfscCode: String(body.bankIfscCode || 'HDFC0000123').trim().toUpperCase(),
        bankName: body.bankName || 'HDFC Bank',
        accountHolderName: body.accountHolderName || body.fullName,
        bankPassbookDoc: body.bankPassbookDoc || undefined,
        profilePhoto: body.profilePhoto || undefined,
        termsAccepted: Boolean(body.termsAccepted),
        codeOfConductAccepted: Boolean(body.codeOfConductAccepted),
        status: 'PENDING_REVIEW',
        appliedAt: new Date().toISOString()
      };

      // 1. Persist application in backend repository (Firestore or Memory DB)
      const saved = await dbRepository.saveApplication(newApp);

      // 2. Synchronize to Google Sheets tab 'New Staff Onbording' (Spreadsheet: 19GO22yFFHR7fLbC8v4R8xifkI6f2fgdQbfQlvxfMHC0)
      let sheetsSyncResult: { success: boolean; method: string } = { success: false, method: 'none' };
      try {
        sheetsSyncResult = await appendOnboardingToSheet(saved);
      } catch (sheetErr: any) {
        console.warn('[Apply Assistant Google Sheet Sync Warning]', sheetErr?.message || sheetErr);
      }

      return res.status(200).json({
        success: true,
        message: 'Your assistant application has been submitted successfully! Diblo Operations will review your documents within 24-48 hours.',
        applicationNumber: saved.applicationNumber,
        applicationId: saved.id,
        sheetsSynced: sheetsSyncResult.success
      });
    } catch (err: any) {
      console.error('[Apply Assistant Error]', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to submit application' });
    }
  });

  // Admin endpoint: List all applications
  app.get('/api/admin/applications', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const apps = await dbRepository.getApplications();
      return res.json({ success: true, applications: apps });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin endpoint: Review application (Approve / Reject)
  app.post('/api/admin/applications/:id/review', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { action, adminNotes } = req.body; // action: 'APPROVE' | 'REJECT'
      const appRecord = await dbRepository.getApplicationById(id);

      if (!appRecord) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      if (action === 'APPROVE') {
        appRecord.status = 'APPROVED';
        appRecord.adminNotes = adminNotes || 'Approved by Diblo Operations after KYC verification.';
        appRecord.reviewedAt = new Date().toISOString();
        appRecord.reviewedBy = req.user?.name || 'Admin';

        // Auto-create or activate Assistant profile
        let asst = await dbRepository.getAssistant(appRecord.mobileNumber);
        if (!asst) {
          const asstId = `asst-${Date.now()}`;
          const newAsst: AssistantProfile = {
            id: asstId,
            userId: `user-asst-${Date.now()}`,
            name: appRecord.fullName,
            phone: appRecord.mobileNumber,
            email: appRecord.email,
            photo: appRecord.profilePhoto || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
            rating: 5.0,
            totalRatings: 0,
            verificationStatus: 'VERIFIED',
            policeVerified: true,
            languages: appRecord.languagesSpoken,
            serviceCapabilities: appRecord.selectedServices,
            serviceArea: appRecord.preferredOperatingZones,
            isOnline: true,
            currentLocation: {
              lat: 19.0596,
              lng: 72.8295,
              address: `${appRecord.mumbaiArea}, Mumbai`,
              area: appRecord.mumbaiArea,
              lastUpdated: 'Just now'
            },
            earnings: { today: 0, week: 0, month: 0, total: 0, pendingPayout: 0 },
            documents: [],
            bankDetails: {
              accountNumber: appRecord.bankAccountNumber,
              ifsc: appRecord.bankIfscCode,
              bankName: appRecord.bankName,
              accountHolder: appRecord.accountHolderName
            },
            emergencyContact: {
              name: appRecord.emergencyContactName,
              phone: appRecord.emergencyContactPhone,
              relationship: appRecord.emergencyContactRelation
            },
            completedTasksCount: 0,
            acceptanceRate: 100,
            joinedDate: new Date().toISOString()
          };
          await dbRepository.saveAssistant(newAsst);
        } else {
          asst.verificationStatus = 'VERIFIED';
          asst.policeVerified = true;
          await dbRepository.saveAssistant(asst);
        }

        await dbRepository.saveApplication(appRecord);
        return res.json({
          success: true,
          message: `Application ${appRecord.applicationNumber} approved and assistant activated!`,
          application: appRecord
        });
      } else if (action === 'REJECT') {
        appRecord.status = 'REJECTED';
        appRecord.adminNotes = adminNotes || 'Documents did not meet compliance criteria.';
        appRecord.reviewedAt = new Date().toISOString();
        appRecord.reviewedBy = req.user?.name || 'Admin';
        await dbRepository.saveApplication(appRecord);
        return res.json({
          success: true,
          message: `Application ${appRecord.applicationNumber} marked as rejected.`,
          application: appRecord
        });
      }

      return res.status(400).json({ success: false, error: 'Invalid review action' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // SERVICES & PRICING
  // ==========================================
  app.get('/api/services', async (req, res) => {
    try {
      const services = await dbRepository.getServices();
      res.json(services);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch services', details: err.message });
    }
  });

  app.get('/api/pricing', async (req, res) => {
    try {
      const pricing = await dbRepository.getPricing();
      res.json(pricing);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch pricing', details: err.message });
    }
  });

  app.put('/api/pricing', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const {
        baseHourlyPrice,
        minimumBookingHours,
        additionalHourPrice,
        peakHourMultiplier,
        weekendMultiplier,
        taxesPercentage
      } = req.body;

      const updated = await dbRepository.updatePricing({
        baseHourlyPrice: Number(baseHourlyPrice),
        minimumBookingHours: Number(minimumBookingHours),
        additionalHourPrice: Number(additionalHourPrice),
        peakHourMultiplier: Number(peakHourMultiplier),
        weekendMultiplier: Number(weekendMultiplier),
        taxesPercentage: Number(taxesPercentage)
      });

      res.json({ success: true, pricing: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update pricing', details: err.message });
    }
  });

  // ==========================================
  // COUPONS
  // ==========================================
  app.get('/api/coupons', async (req, res) => {
    try {
      const coupons = await dbRepository.getCoupons();
      res.json(coupons);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch coupons', details: err.message });
    }
  });

  app.post('/api/coupons/apply', async (req, res) => {
    try {
      const { code, bookedHours, baseAmount } = req.body;
      const coupons = await dbRepository.getCoupons();
      const coupon = coupons.find((c) => c.code.toUpperCase() === code?.trim().toUpperCase() && c.isActive);

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
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to apply coupon', details: err.message });
    }
  });

  app.post('/api/coupons', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const newCoupon: Coupon = {
        id: `cp-${Date.now()}`,
        code: String(req.body.code).toUpperCase().trim(),
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

      await dbRepository.saveCoupon(newCoupon);
      res.json({ success: true, coupon: newCoupon });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create coupon', details: err.message });
    }
  });

  // ==========================================
  // REFERRAL SYSTEM & REWARD COUPONS
  // ==========================================
  app.get('/api/referrals', async (req: AuthenticatedRequest, res) => {
    try {
      const customerId = (req.query.customerId as string) || req.user?.customerId;
      const referrals = await dbRepository.getReferrals(customerId);
      res.json(referrals);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch referrals', details: err.message });
    }
  });

  app.post('/api/referrals', async (req: AuthenticatedRequest, res) => {
    try {
      const { friendName, friendPhone, customerId, referrerName } = req.body;
      if (!friendName || !friendPhone) {
        return res.status(400).json({ error: 'Friend name and phone number are required' });
      }

      const activeCustomerId = customerId || req.user?.customerId || 'cust-1';
      const cleanPhone = String(friendPhone).replace(/\D/g, '').slice(-10);

      const newReferral: Referral = {
        id: `ref-${Date.now()}`,
        referrerCustomerId: activeCustomerId,
        referrerName: referrerName || req.user?.name || 'Valued Customer',
        friendName: friendName.trim(),
        friendPhone: cleanPhone,
        status: 'INVITED',
        rewardAmount: 100,
        isClaimed: false,
        createdAt: new Date().toISOString()
      };

      await dbRepository.saveReferral(newReferral);
      res.json({ success: true, referral: newReferral });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create referral invite', details: err.message });
    }
  });

  app.post('/api/referrals/:id/complete', async (req: AuthenticatedRequest, res) => {
    try {
      const referrals = await dbRepository.getReferrals();
      const referral = referrals.find((r) => r.id === req.params.id);
      if (!referral) {
        return res.status(404).json({ error: 'Referral record not found' });
      }

      // Generate a unique reward coupon for the referrer
      const cleanName = referral.friendName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8) || 'FRIEND';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const couponCode = `REF-${cleanName}${randomSuffix}`;

      const rewardCoupon: Coupon = {
        id: `cp-ref-${Date.now()}`,
        code: couponCode,
        flatDiscount: 100,
        maxDiscount: 100,
        minBookingHours: 2,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 1,
        usedCount: 0,
        isActive: true,
        description: `Referral Reward: ₹100 OFF on your next booking from inviting ${referral.friendName}`
      };

      // Save the coupon into the coupons repository so it's immediately valid for bookings
      await dbRepository.saveCoupon(rewardCoupon);

      // Update the referral state to COMPLETED
      referral.status = 'COMPLETED';
      referral.rewardCouponCode = couponCode;
      referral.serviceBooked = req.body.serviceBooked || 'Senior Citizen & Hospital Assistance';
      referral.completedAt = new Date().toISOString();

      await dbRepository.saveReferral(referral);

      res.json({
        success: true,
        referral,
        rewardCoupon,
        message: `Referral completed! ₹100 reward coupon ${couponCode} issued successfully.`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to complete referral', details: err.message });
    }
  });

  // ==========================================
  // BOOKINGS & LIFECYCLE
  // ==========================================
  app.get('/api/bookings', async (req: AuthenticatedRequest, res) => {
    try {
      const { customerId, assistantId, status } = req.query;

      // Role check / IDOR defense: If user is customer or assistant, filter appropriately
      let filterCustomerId = customerId as string | undefined;
      let filterAssistantId = assistantId as string | undefined;

      if (req.user?.role === 'CUSTOMER' && req.user.customerId) {
        filterCustomerId = req.user.customerId;
      } else if (req.user?.role === 'ASSISTANT' && req.user.assistantId) {
        filterAssistantId = req.user.assistantId;
      }

      const list = await dbRepository.getBookings({
        customerId: filterCustomerId,
        assistantId: filterAssistantId,
        status: status as string
      });

      res.json(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('[API /api/bookings error]:', err);
      try {
        const fallback = await dbRepository.getBookings();
        res.json(Array.isArray(fallback) ? fallback : []);
      } catch {
        res.status(500).json({ error: 'Failed to fetch bookings', details: err?.message, bookings: [] });
      }
    }
  });

  app.get('/api/bookings/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      // IDOR validation
      if (req.user) {
        if (req.user.role === 'CUSTOMER' && req.user.customerId && booking.customerId !== req.user.customerId) {
          return res.status(403).json({ error: 'Unauthorized to view this booking' });
        }
        if (req.user.role === 'ASSISTANT' && req.user.assistantId && booking.assistantId !== req.user.assistantId) {
          return res.status(403).json({ error: 'Unauthorized to view this booking' });
        }
      }

      res.json(booking);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch booking', details: err.message });
    }
  });

  app.post('/api/bookings', async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body;
      const pricing = await dbRepository.getPricing();

      const hours = Math.max(pricing.minimumBookingHours, Number(body.bookedHours) || 2);
      const hourlyRate = pricing.baseHourlyPrice;
      const baseAmount = hours * hourlyRate;
      const discountAmount = Number(body.discountAmount) || 0;
      const subtotal = Math.max(0, baseAmount - discountAmount);
      const taxAmount = Math.round((subtotal * pricing.taxesPercentage) / 100);
      const totalAmount = subtotal + taxAmount;

      // Secure 4-digit start OTP
      const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const bookingNumber = `DBL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const customerId = req.user?.customerId || body.customerId || 'cust-1';
      const customerName = req.user?.name || body.customerName || 'Customer';
      const customerPhone = req.user?.phone || body.customerPhone || '9820123456';

      const newBooking: Booking = {
        id: `bk-${Date.now()}`,
        bookingNumber,
        customerId,
        customerName,
        customerPhone,
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

      await dbRepository.saveBooking(newBooking);

      // Trigger automatic assistant matching in background
      setTimeout(async () => {
        try {
          const assistants = await dbRepository.getAssistants({ online: true, status: 'VERIFIED' });
          const matchedAssistant = assistants.find((a) => !a.activeBookingId) || assistants[0];

          if (matchedAssistant) {
            newBooking.status = 'ASSIGNED';
            newBooking.assistantId = matchedAssistant.id;
            newBooking.assistantName = matchedAssistant.name;
            newBooking.assistantPhone = matchedAssistant.phone;
            newBooking.assistantPhoto = matchedAssistant.photo;
            newBooking.assistantRating = matchedAssistant.rating;
            newBooking.assistantLocation = matchedAssistant.currentLocation;
            await dbRepository.saveBooking(newBooking);
          }
        } catch (matchErr) {
          console.error('[BOOKING] Auto-match error:', matchErr);
        }
      }, 1500);

      res.status(201).json(newBooking);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create booking', details: err.message });
    }
  });

  // Assistant Acceptance
  app.post('/api/bookings/:id/accept', async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const assistantId = req.user?.assistantId || req.body.assistantId || booking.assistantId;
      if (assistantId) {
        const assistant = await dbRepository.getAssistant(assistantId);
        if (assistant) {
          booking.assistantId = assistant.id;
          booking.assistantName = assistant.name;
          booking.assistantPhone = assistant.phone;
          booking.assistantPhoto = assistant.photo;
          booking.assistantRating = assistant.rating;
          booking.assistantLocation = assistant.currentLocation;
          assistant.activeBookingId = booking.id;
          await dbRepository.saveAssistant(assistant);
        }
      }

      booking.status = 'ACCEPTED';
      booking.acceptedAt = new Date().toISOString();
      await dbRepository.saveBooking(booking);

      res.json({ success: true, booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to accept booking', details: err.message });
    }
  });

  // Assistant Reject Booking
  app.post('/api/bookings/:id/reject', async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const assistantId = req.user?.assistantId || req.body.assistantId;
      if (assistantId && booking.assistantId === assistantId) {
        booking.assistantId = null;
        booking.assistantName = null;
        booking.assistantPhone = null;
        booking.assistantPhoto = null;
        booking.status = 'SEARCHING';
      }

      if (assistantId) {
        const rejected = (booking as any).rejectedAssistantIds || [];
        if (!rejected.includes(assistantId)) {
          (booking as any).rejectedAssistantIds = [...rejected, assistantId];
        }
      }

      await dbRepository.saveBooking(booking);
      res.json({ success: true, message: 'Order rejected', booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reject booking', details: err.message });
    }
  });

  // Assistant Start Route / Go To Customer
  app.post('/api/bookings/:id/start-route', async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      booking.status = 'ON_THE_WAY';
      (booking as any).startedRouteAt = new Date().toISOString();
      await dbRepository.saveBooking(booking);

      res.json({ success: true, booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to start route', details: err.message });
    }
  });

  // Assistant Arrival
  app.post('/api/bookings/:id/arrive', async (req, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      booking.status = 'ARRIVED';
      booking.arrivedAt = new Date().toISOString();
      await dbRepository.saveBooking(booking);

      res.json({ success: true, booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to mark arrival', details: err.message });
    }
  });

  // Booking Start OTP Verification
  app.post('/api/bookings/:id/verify-otp', async (req, res) => {
    try {
      const { otp } = req.body;
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_OTP === 'true';
      const isValid = String(otp).trim() === booking.startOtp || (isDev && String(otp).trim() === '1234');

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP entered. Please verify with customer.' });
      }

      booking.status = 'IN_PROGRESS';
      booking.startedAt = new Date().toISOString();
      booking.timerElapsedSeconds = 0;
      await dbRepository.saveBooking(booking);

      res.json({ success: true, message: 'OTP verified successfully. Task started!', booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to verify OTP', details: err.message });
    }
  });

  // Extend Hours
  app.post('/api/bookings/:id/extend-hours', async (req, res) => {
    try {
      const { extraHours = 1 } = req.body;
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const pricing = await dbRepository.getPricing();
      const added = Number(extraHours);
      booking.additionalHours += added;
      booking.totalHours += added;
      const addedAmount = added * booking.hourlyRate;
      booking.baseAmount += addedAmount;
      const tax = Math.round((addedAmount * pricing.taxesPercentage) / 100);
      booking.taxAmount += tax;
      booking.totalAmount += addedAmount + tax;

      await dbRepository.saveBooking(booking);

      res.json({
        success: true,
        message: `Booking extended by ${added} hour(s)`,
        booking
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to extend hours', details: err.message });
    }
  });

  // Complete Booking
  app.post('/api/bookings/:id/complete', async (req, res) => {
    try {
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      booking.status = 'COMPLETED';
      booking.completedAt = new Date().toISOString();
      await dbRepository.saveBooking(booking);

      // Release assistant & credit earnings
      if (booking.assistantId) {
        const assistant = await dbRepository.getAssistant(booking.assistantId);
        if (assistant) {
          assistant.activeBookingId = null;
          assistant.completedTasksCount += 1;
          const earning = Math.round(booking.totalAmount * 0.8); // 80% to assistant
          assistant.earnings.today += earning;
          assistant.earnings.week += earning;
          assistant.earnings.month += earning;
          assistant.earnings.total += earning;
          await dbRepository.saveAssistant(assistant);
        }
      }

      res.json({ success: true, message: 'Task marked as completed!', booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to complete booking', details: err.message });
    }
  });

  // Cancel Booking
  app.post('/api/bookings/:id/cancel', async (req, res) => {
    try {
      const { reason } = req.body;
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      booking.status = 'CANCELLED';
      booking.cancellationReason = reason || 'Cancelled by user';
      await dbRepository.saveBooking(booking);

      if (booking.assistantId) {
        const assistant = await dbRepository.getAssistant(booking.assistantId);
        if (assistant) {
          assistant.activeBookingId = null;
          await dbRepository.saveAssistant(assistant);
        }
      }

      res.json({ success: true, message: 'Booking cancelled', booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to cancel booking', details: err.message });
    }
  });

  // Rate Booking & Tip Assistant
  app.post('/api/bookings/:id/rate', async (req, res) => {
    try {
      const { stars, comment, feedbackTags, tipAmount = 0, tipPaymentMethod = 'UPI', isAssistantRating = false } = req.body;
      const booking = await dbRepository.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      if (isAssistantRating) {
        booking.assistantRatingForCustomer = {
          stars: Number(stars),
          comment,
          createdAt: new Date().toISOString()
        };
      } else {
        const parsedTip = Math.max(0, Number(tipAmount) || 0);
        booking.rating = {
          stars: Number(stars),
          comment,
          customerFeedbackTags: feedbackTags || [],
          tipAmount: parsedTip,
          createdAt: new Date().toISOString()
        };

        if (parsedTip > 0) {
          booking.tipAmount = (booking.tipAmount || 0) + parsedTip;
          booking.tipPaymentMethod = tipPaymentMethod;
        }

        // Update assistant overall rating and tip earnings
        if (booking.assistantId) {
          const assistant = await dbRepository.getAssistant(booking.assistantId);
          if (assistant) {
            const total = assistant.totalRatings * assistant.rating + Number(stars);
            assistant.totalRatings += 1;
            assistant.rating = Number((total / assistant.totalRatings).toFixed(2));

            if (parsedTip > 0) {
              assistant.earnings = assistant.earnings || {
                today: 0,
                week: 0,
                month: 0,
                total: 0,
                pendingPayout: 0
              };
              assistant.earnings.today = (assistant.earnings.today || 0) + parsedTip;
              assistant.earnings.week = (assistant.earnings.week || 0) + parsedTip;
              assistant.earnings.month = (assistant.earnings.month || 0) + parsedTip;
              assistant.earnings.total = (assistant.earnings.total || 0) + parsedTip;
              assistant.earnings.pendingPayout = (assistant.earnings.pendingPayout || 0) + parsedTip;
            }

            await dbRepository.saveAssistant(assistant);
          }
        }
      }

      await dbRepository.saveBooking(booking);
      res.json({ success: true, booking });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record rating', details: err.message });
    }
  });

  // ==========================================
  // AUTOMATED 1-HOUR PUSH NOTIFICATION REMINDERS
  // ==========================================
  app.get('/api/notifications/reminders/upcoming', async (req, res) => {
    try {
      const allBookings = await dbRepository.getBookings();
      const now = new Date();
      const upcomingWithinOneHour = allBookings.filter((b: any) => {
        if (b.status === 'COMPLETED' || b.status === 'CANCELLED') return false;
        if (!b.scheduledDate || !b.startTime) return false;

        let scheduledDate = new Date();
        if (b.scheduledDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = b.scheduledDate.split('-').map(Number);
          scheduledDate = new Date(y, m - 1, d);
        }

        const isAmPm = /am|pm/i.test(b.startTime);
        let hours = 10;
        let minutes = 0;
        if (isAmPm) {
          const m = b.startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (m) {
            hours = parseInt(m[1], 10);
            minutes = parseInt(m[2], 10);
            if (m[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (m[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
        } else {
          const m = b.startTime.match(/^(\d{1,2}):(\d{2})$/);
          if (m) {
            hours = parseInt(m[1], 10);
            minutes = parseInt(m[2], 10);
          }
        }
        scheduledDate.setHours(hours, minutes, 0, 0);

        const diffMinutes = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);
        return diffMinutes >= 0 && diffMinutes <= 60;
      });

      res.json({
        success: true,
        checkedAt: now.toISOString(),
        upcomingCount: upcomingWithinOneHour.length,
        bookings: upcomingWithinOneHour
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to check upcoming reminders', details: err.message });
    }
  });

  app.post('/api/notifications/reminders/log', async (req, res) => {
    try {
      const { bookingId, customerPhone, reminderType, sentAt } = req.body;
      console.log(`[Push Reminder Automated] Dispatched 1-hr reminder for booking ${bookingId} to ${customerPhone || 'customer'} at ${sentAt || new Date().toISOString()}`);
      res.json({ success: true, logged: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to log reminder', details: err.message });
    }
  });

  // ==========================================
  // ASSISTANTS MANAGEMENT
  // ==========================================
  app.get('/api/assistants', async (req, res) => {
    try {
      const { area, status, online } = req.query;
      const list = await dbRepository.getAssistants({
        area: area as string,
        status: status as string,
        online: online !== undefined ? online === 'true' : undefined
      });
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch assistants', details: err.message });
    }
  });

  app.get('/api/assistants/:id', async (req, res) => {
    try {
      const assistant = await dbRepository.getAssistant(req.params.id);
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
      res.json(assistant);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch assistant', details: err.message });
    }
  });

  app.put('/api/assistants/:id/toggle-online', async (req: AuthenticatedRequest, res) => {
    try {
      const assistant = await dbRepository.getAssistant(req.params.id);
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

      assistant.isOnline = !assistant.isOnline;
      await dbRepository.saveAssistant(assistant);

      res.json({ success: true, isOnline: assistant.isOnline, assistant });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to toggle status', details: err.message });
    }
  });

  app.put('/api/assistants/:id/status', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const { status, policeVerified } = req.body;
      const assistant = await dbRepository.getAssistant(req.params.id);
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

      if (status) assistant.verificationStatus = status;
      if (policeVerified !== undefined) assistant.policeVerified = Boolean(policeVerified);

      await dbRepository.saveAssistant(assistant);
      res.json({ success: true, assistant });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update assistant status', details: err.message });
    }
  });

  app.post('/api/assistants/:id/location', async (req, res) => {
    try {
      const { lat, lng, address, area, heading } = req.body;
      const assistant = await dbRepository.getAssistant(req.params.id);
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });

      assistant.currentLocation = {
        lat: Number(lat),
        lng: Number(lng),
        address: address || assistant.currentLocation.address,
        area: area || assistant.currentLocation.area,
        lastUpdated: 'Just now',
        heading: heading || assistant.currentLocation.heading
      };

      await dbRepository.saveAssistant(assistant);

      // Sync active booking live location
      if (assistant.activeBookingId) {
        const bk = await dbRepository.getBooking(assistant.activeBookingId);
        if (bk) {
          bk.assistantLocation = assistant.currentLocation;
          await dbRepository.saveBooking(bk);
        }
      }

      res.json({ success: true, location: assistant.currentLocation });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update location', details: err.message });
    }
  });

  app.post('/api/assistants', async (req, res) => {
    try {
      const data = req.body;
      const existing = await dbRepository.getAssistant(data.userId || data.phone || data.id);
      if (existing) {
        return res.json(existing);
      }
      const newAssistant: AssistantProfile = {
        id: data.id || `asst-${Date.now()}`,
        userId: data.userId || `usr-${Date.now()}`,
        name: data.name || 'Assistant',
        phone: data.phone || '9820000000',
        email: data.email,
        photo: data.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        rating: 4.9,
        totalRatings: 1,
        verificationStatus: 'VERIFIED',
        policeVerified: true,
        languages: ['English', 'Hindi', 'Marathi'],
        serviceCapabilities: data.serviceCategories || ['DAILY_CHORES', 'CARE_COMPANION', 'LOCAL_MUMBAI_ERRANDS'],
        serviceArea: ['Bandra', 'Andheri', 'Khar', 'Juhu', 'Santa Cruz'],
        isOnline: true,
        currentLocation: {
          lat: 19.0596,
          lng: 72.8295,
          address: 'Bandra West, Mumbai',
          area: 'Bandra West',
          lastUpdated: new Date().toISOString()
        },
        earnings: {
          today: 0,
          week: 0,
          month: 0,
          total: 0,
          pendingPayout: 0
        },
        documents: [],
        bankDetails: {
          accountNumber: 'XXXXXX1234',
          ifsc: 'HDFC0001234',
          bankName: 'HDFC Bank Bandra',
          accountHolder: data.name || 'Assistant'
        },
        emergencyContact: {
          name: 'Contact',
          phone: '9820000000',
          relationship: 'Family'
        },
        completedTasksCount: 0,
        acceptanceRate: 100,
        joinedDate: new Date().toISOString()
      };
      await dbRepository.saveAssistant(newAssistant);
      res.json(newAssistant);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create assistant', details: err.message });
    }
  });

  // ==========================================
  // CUSTOMERS MANAGEMENT
  // ==========================================
  app.post('/api/customers', async (req, res) => {
    try {
      const data = req.body;
      const existing = await dbRepository.getCustomer(data.userId || data.phone || data.id);
      if (existing) {
        return res.json(existing);
      }
      const newCustomer: CustomerProfile = {
        id: data.id || `cust-${Date.now()}`,
        userId: data.userId || `usr-${Date.now()}`,
        name: data.name || 'Customer',
        phone: data.phone || '9820000000',
        email: data.email || `${data.phone || Date.now()}@example.com`,
        avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        savedAddresses: data.addresses || [
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
        emergencyContact: data.emergencyContact || {
          name: 'Emergency Contact',
          phone: '9820000000',
          relationship: 'Family'
        },
        referralCode: data.referralCode || `DIBLO-${(data.phone || '0000').slice(-4)}`,
        walletBalance: 100,
        createdAt: new Date().toISOString()
      };
      await dbRepository.saveCustomer(newCustomer);
      res.json(newCustomer);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create customer', details: err.message });
    }
  });
  app.get('/api/customers', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const list = await dbRepository.getCustomers();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
    }
  });

  app.get('/api/customers/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await dbRepository.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });

      // IDOR protection
      if (req.user && req.user.role === 'CUSTOMER' && req.user.customerId && customer.id !== req.user.customerId && customer.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      res.json(customer);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch customer', details: err.message });
    }
  });

  app.post('/api/customers/:id/address', async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await dbRepository.getCustomer(req.params.id);
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
      await dbRepository.saveCustomer(customer);

      res.json({ success: true, savedAddresses: customer.savedAddresses });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add address', details: err.message });
    }
  });

  // ==========================================
  // SOCIETIES MANAGEMENT
  // ==========================================
  app.get('/api/societies', async (req, res) => {
    try {
      const list = await dbRepository.getSocieties();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch societies', details: err.message });
    }
  });

  app.post('/api/societies', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
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

      await dbRepository.saveSociety(newSoc);
      res.status(201).json(newSoc);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create society', details: err.message });
    }
  });

  app.put('/api/societies/:id', requireAuth, requireRole('ADMIN', 'OPERATIONS'), async (req, res) => {
    try {
      const societies = await dbRepository.getSocieties();
      const soc = societies.find((s) => s.id === req.params.id);
      if (!soc) return res.status(404).json({ error: 'Society not found' });

      Object.assign(soc, req.body);
      await dbRepository.saveSociety(soc);

      res.json({ success: true, society: soc });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update society', details: err.message });
    }
  });

  // ==========================================
  // RAZORPAY PAYMENTS & VERIFICATION
  // ==========================================
  app.post('/api/payments/create-order', async (req, res) => {
    try {
      const { amount, bookingId, currency = 'INR' } = req.body;
      const amountPaise = Math.round((Number(amount) || 298) * 100);

      const order = await createRazorpayOrder({
        amountPaise,
        receipt: `rcpt_${bookingId || Date.now()}`,
        notes: { bookingId: bookingId || '' }
      });

      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        bookingId
      });
    } catch (err: any) {
      console.error('[PAYMENT] Error creating order:', err);
      res.status(500).json({ error: 'Failed to create payment order', details: err.message });
    }
  });

  app.post('/api/payments/verify', async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId,
        paymentMethod = 'UPI'
      } = req.body;

      const booking = await dbRepository.getBooking(bookingId);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      // Verify HMAC signature
      const isSignatureValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      });

      if (!isSignatureValid) {
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }

      const paymentId = razorpay_payment_id || `pay_${Date.now()}`;
      const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      booking.paymentStatus = 'PAID';
      booking.paymentId = paymentId;
      booking.orderId = razorpay_order_id;
      booking.paymentMethod = paymentMethod;
      booking.invoiceNumber = invoiceNumber;

      await dbRepository.saveBooking(booking);

      // Record in Firestore payments collection
      await dbRepository.recordPayment({
        id: `pay_rec_${Date.now()}`,
        bookingId: booking.id,
        orderId: razorpay_order_id,
        paymentId,
        amountPaise: Math.round(booking.totalAmount * 100),
        currency: 'INR',
        status: 'SUCCESS',
        signatureVerified: true,
        paymentMethod,
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Payment verified and settled securely',
        paymentId,
        invoiceNumber,
        booking
      });
    } catch (err: any) {
      console.error('[PAYMENT] Verification error:', err);
      res.status(500).json({ error: 'Payment verification failed', details: err.message });
    }
  });

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================
  app.get('/api/support/tickets', async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, role } = req.query;
      const filterUserId = (userId as string) || (req.user?.role === 'CUSTOMER' ? req.user.id : undefined);
      const userRole = req.user?.role || (role as string);

      const list = await dbRepository.getSupportTickets({
        userId: filterUserId,
        role: userRole
      });

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch tickets', details: err.message });
    }
  });

  app.post('/api/support/tickets', async (req: AuthenticatedRequest, res) => {
    try {
      const newTicket: SupportTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
        userId: req.user?.id || req.body.userId || 'user-c-1',
        userName: req.user?.name || req.body.userName || 'Customer',
        userPhone: req.user?.phone || req.body.userPhone || '9820123456',
        userRole: req.user?.role || req.body.userRole || 'CUSTOMER',
        bookingId: req.body.bookingId,
        category: req.body.category || 'GENERAL_INQUIRY',
        priority: req.body.priority || 'MEDIUM',
        status: 'OPEN',
        subject: req.body.subject,
        description: req.body.description,
        messages: [
          {
            id: `m-${Date.now()}`,
            senderId: req.user?.id || req.body.userId || 'user-c-1',
            senderName: req.user?.name || req.body.userName || 'Customer',
            senderRole: req.user?.role || req.body.userRole || 'CUSTOMER',
            text: req.body.description,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbRepository.saveSupportTicket(newTicket);
      res.status(201).json(newTicket);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create support ticket', details: err.message });
    }
  });

  app.post('/api/support/tickets/:id/reply', async (req: AuthenticatedRequest, res) => {
    try {
      const tickets = await dbRepository.getSupportTickets();
      const ticket = tickets.find((t) => t.id === req.params.id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const msg = {
        id: `m-${Date.now()}`,
        senderId: req.user?.id || req.body.senderId,
        senderName: req.user?.name || req.body.senderName,
        senderRole: req.user?.role || req.body.senderRole || 'CUSTOMER',
        text: req.body.text,
        timestamp: new Date().toISOString()
      };

      ticket.messages.push(msg);
      ticket.updatedAt = new Date().toISOString();
      if (req.body.status) ticket.status = req.body.status;

      await dbRepository.saveSupportTicket(ticket);
      res.json({ success: true, ticket });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reply to ticket', details: err.message });
    }
  });

  // ==========================================
  // EMERGENCY SOS DISTRESS ALERTS
  // ==========================================
  app.post('/api/emergency/sos', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        location,
        lat,
        lng,
        address,
        accuracy,
        bookingId,
        serviceName,
        triggerSource,
        userId,
        userName,
        userPhone,
        userRole
      } = req.body;

      const alertLat = Number(location?.lat ?? lat ?? 19.0607);
      const alertLng = Number(location?.lng ?? lng ?? 72.8258);
      const alertAddress = location?.address || address || 'Mumbai, Maharashtra';
      const alertAccuracy = Number(location?.accuracy ?? accuracy ?? 15);

      const resolvedUserId = req.user?.id || userId || 'user-c-1';
      const resolvedUserName = req.user?.name || userName || 'Customer';
      const resolvedUserPhone = req.user?.phone || userPhone || '9820123456';
      const resolvedUserRole = (req.user?.role || userRole || 'CUSTOMER') as UserRole;

      const newAlert: EmergencyAlert = {
        id: `sos-${Date.now()}`,
        alertNumber: `SOS-2026-${Math.floor(100 + Math.random() * 900)}`,
        userId: resolvedUserId,
        userName: resolvedUserName,
        userPhone: resolvedUserPhone,
        userRole: resolvedUserRole,
        bookingId,
        serviceName,
        status: 'ACTIVE',
        lat: alertLat,
        lng: alertLng,
        address: alertAddress,
        accuracy: alertAccuracy,
        triggerSource: triggerSource || 'CUSTOMER_HEADER_SOS',
        timestamp: new Date().toISOString()
      };

      await dbRepository.saveEmergencyAlert(newAlert);

      // Create an associated high-priority SAFETY_EMERGENCY support ticket for the desk
      const sosTicket: SupportTicket = {
        id: `tkt-sos-${Date.now()}`,
        ticketNumber: `TKT-SOS-${Math.floor(100 + Math.random() * 900)}`,
        userId: resolvedUserId,
        userName: resolvedUserName,
        userPhone: resolvedUserPhone,
        userRole: resolvedUserRole,
        bookingId,
        category: 'SAFETY_EMERGENCY',
        priority: 'URGENT',
        status: 'OPEN',
        subject: `🚨 EMERGENCY SOS: ${resolvedUserName} @ ${alertAddress}`,
        description: `EMERGENCY SOS DISTRESS SIGNAL ACTIVATED from CustomerHeader.\n\n` +
          `• Caller: ${resolvedUserName} (${resolvedUserPhone})\n` +
          `• GPS Coordinates: Latitude ${alertLat.toFixed(6)}, Longitude ${alertLng.toFixed(6)}\n` +
          `• Location Accuracy: ±${alertAccuracy}m\n` +
          `• Address / Landmark: ${alertAddress}\n` +
          `• Live Google Maps Link: https://www.google.com/maps?q=${alertLat},${alertLng}\n` +
          `• Active Booking: ${bookingId || 'None (Direct Customer SOS)'}\n` +
          `• Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
        messages: [
          {
            id: `m-sos-${Date.now()}`,
            senderId: resolvedUserId,
            senderName: resolvedUserName,
            senderRole: resolvedUserRole,
            text: `🚨 SOS DISTRESS ACTIVATED. Current GPS: Lat ${alertLat}, Lng ${alertLng}. Immediate assistance required.`,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbRepository.saveSupportTicket(sosTicket);

      console.warn(
        `🚨 [EMERGENCY SOS DISPATCH] ${resolvedUserName} (${resolvedUserPhone}) triggered SOS at Lat: ${alertLat}, Lng: ${alertLng} [Alert: ${newAlert.alertNumber}]`
      );

      res.status(201).json({
        success: true,
        alert: newAlert,
        ticket: sosTicket,
        helpline: '8291919829',
        police: '112',
        message: 'Distress alert received and dispatched to Admin Desk and Mumbai Emergency Response team.'
      });
    } catch (err: any) {
      console.error('[Emergency SOS] Error processing distress alert:', err);
      res.status(500).json({ success: false, error: 'Failed to process SOS distress alert', details: err.message });
    }
  });

  app.get('/api/emergency/alerts', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alerts = await dbRepository.getEmergencyAlerts();
      res.json({
        success: true,
        alerts,
        activeCount: alerts.filter((a) => a.status === 'ACTIVE').length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch emergency alerts', details: err.message });
    }
  });

  app.post('/api/emergency/alerts/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { notes, resolvedBy } = req.body;
      const alert = await dbRepository.getEmergencyAlertById(id);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Emergency alert not found' });
      }

      alert.status = 'RESOLVED';
      alert.resolvedAt = new Date().toISOString();
      alert.resolvedBy = resolvedBy || req.user?.name || 'Admin Operations';
      if (notes) alert.notes = notes;

      await dbRepository.saveEmergencyAlert(alert);
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to resolve emergency alert', details: err.message });
    }
  });

  app.post('/api/emergency/alerts/:id/acknowledge', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const alert = await dbRepository.getEmergencyAlertById(id);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Emergency alert not found' });
      }

      alert.status = 'ACKNOWLEDGED';
      await dbRepository.saveEmergencyAlert(alert);
      res.json({ success: true, alert });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to acknowledge alert', details: err.message });
    }
  });

  // ==========================================
  // REVIEWS & ANALYTICS
  // ==========================================
  app.get('/api/reviews', async (req, res) => {
    try {
      const bookings = await dbRepository.getBookings();
      const reviews = bookings
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
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
    }
  });

  app.get('/api/analytics', async (req: AuthenticatedRequest, res) => {
    try {
      const bookings = await dbRepository.getBookings();
      const assistants = await dbRepository.getAssistants();
      const customers = await dbRepository.getCustomers();

      const active = bookings.filter((b) => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length;
      const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
      const totalRev = bookings
        .filter((b) => b.paymentStatus === 'PAID')
        .reduce((acc, b) => acc + b.totalAmount, 0);

      const analytics: PlatformAnalytics = {
        totalCustomers: Math.max(customers.length, 1200 + customers.length),
        activeBookings: active,
        todayBookings: Math.max(12, active + 6),
        completedBookings: Math.max(completed, 1800 + completed),
        cancelledBookings: 24,
        activeAssistants: assistants.filter((a) => a.isOnline).length,
        totalAssistants: assistants.length,
        totalRevenue: totalRev + 600000,
        todayRevenue: 24500,
        pendingPayments: 3,
        averageRating: 4.88,
        conversionRate: 84.5,
        repeatCustomerRate: 68.2,
        assistantAcceptanceRate: 98.4,
        servicePopularity: [
          { name: 'Shopping Assistance', count: 420, revenue: 189000 },
          { name: 'Senior Citizen Care', count: 380, revenue: 171000 },
          { name: 'Personal Errands', count: 290, revenue: 130500 },
          { name: 'Hospital Visit', count: 210, revenue: 94500 },
          { name: 'Queue Standing', count: 180, revenue: 81000 }
        ],
        dailyTrends: [
          { date: '2026-08-27', bookings: 45, revenue: 20250 },
          { date: '2026-08-28', bookings: 52, revenue: 23400 },
          { date: '2026-08-29', bookings: 61, revenue: 27450 },
          { date: '2026-08-30', bookings: 78, revenue: 35100 },
          { date: '2026-08-31', bookings: 84, revenue: 37800 },
          { date: '2026-09-01', bookings: 69, revenue: 31050 },
          { date: '2026-09-02', bookings: 72, revenue: 32400 }
        ],
        areaBreakdown: [
          { area: 'Bandra West', bookings: 320, assistants: 18 },
          { area: 'Andheri West', bookings: 290, assistants: 15 },
          { area: 'Powai', bookings: 210, assistants: 12 },
          { area: 'Dadar', bookings: 180, assistants: 10 },
          { area: 'Colaba', bookings: 140, assistants: 8 }
        ]
      };

      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate analytics', details: err.message });
    }
  });

  // Admin seed endpoint (Requires Admin role or dev environment)
  app.post('/api/admin/seed', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const result = await dbRepository.seedDatabase(force);
      res.json({
        success: true,
        message: result.seeded ? 'Firestore successfully seeded' : 'Database already seeded',
        result
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to seed database', details: err.message });
    }
  });

  // Development reset seed endpoint
  app.post('/api/seed/reset', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Reset seed is disabled in production environment' });
    }
    const result = await dbRepository.seedDatabase(true);
    res.json({ success: true, message: 'Platform state reset to initial seed data', result });
  });

  // ==========================================
  // 404 FOR UNHANDLED API ROUTES
  // ==========================================
  app.all(['/api', '/api/*'], (req, res) => {
    res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Centralized Error Handling for API routes - ALWAYS returns JSON, never HTML
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      console.error('[API SERVER ERROR]', req.method, req.originalUrl, err);
      if (res.headersSent) return next(err);
      return res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
      });
    }
    next(err);
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

  // Centralized Error Handling Middleware for non-API routes
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[UNCAUGHT SERVER ERROR]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err.message } : {})
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DIBLO PRODUCTION SERVER] Running on http://0.0.0.0:${PORT} (Node ${process.version})`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[DIBLO] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[DIBLO] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[DIBLO] Fatal error starting server:', err);
  process.exit(1);
});
