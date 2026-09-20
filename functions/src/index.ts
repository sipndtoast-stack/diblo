import { onRequest } from 'firebase-functions/v2/https';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { verifyStaffCredentials } from './googleSheetsStaff';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const JWT_SECRET = process.env.SESSION_SECRET || 'diblo-jwt-secret-mumbai-2026-secure';

function generateAuthToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyAuthToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Health check endpoint
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'diblo-cloud-functions',
    region: process.env.FUNCTION_REGION || 'us-central1',
    project: 'diblo-3944a',
    timestamp: new Date().toISOString()
  });
});

function isValidGoogleMapsKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed.startsWith('AIza') && trimmed.length >= 25;
}

// Google Maps Configuration endpoint
app.get(['/api/maps/config', '/maps/config'], (req: Request, res: Response) => {
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';
  const isValid = isValidGoogleMapsKey(mapsKey);
  res.json({
    configured: isValid,
    apiKey: isValid ? mapsKey.trim() : null
  });
});

// Google Maps Reverse Geocoding Proxy
app.get(['/api/maps/reverse-geocode', '/maps/reverse-geocode'], async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';

  if (!isValidGoogleMapsKey(mapsKey)) {
    return res.json({
      formattedAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E, Mumbai, Maharashtra`,
      area: 'Mumbai',
      lat: latitude,
      lng: longitude,
      isFallback: true
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(mapsKey.trim())}`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
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
  } catch (err) {
    return res.json({
      formattedAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E, Mumbai, Maharashtra`,
      area: 'Mumbai',
      lat: latitude,
      lng: longitude,
      isFallback: true
    });
  }
});

// Google Maps Geocoding / Search Proxy
app.get(['/api/maps/geocode', '/maps/geocode'], async (req: Request, res: Response) => {
  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address query is required' });
  }

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';
  const query = address.trim();

  try {
    const searchQuery = query.toLowerCase().includes('mumbai') ? query : `${query}, Mumbai, India`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${encodeURIComponent(mapsKey.trim())}`;
    const response = await fetch(url);
    const data: any = await response.json();

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
  } catch (err) {
    return res.json({ results: [] });
  }
});

// Google Maps Routes API Proxy
app.post(['/api/maps/route', '/maps/route'], async (req: Request, res: Response) => {
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
    const estMinutes = Math.max(4, Math.round(roadDistKm * 3.5));
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

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCb0Fq3FsC-C1mTfM7pugmioQO7fL6Z_MM';

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
      return res.json(estimateRouteFallback());
    }

    const data: any = await response.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const meters = route.distanceMeters || 1000;
      const distKm = Number((meters / 1000).toFixed(1));
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
    return res.json(estimateRouteFallback());
  }
});

// Staff Login endpoint
app.post(['/api/staff/login', '/staff/login'], async (req: Request, res: Response) => {
  try {
    const { mobileNumber, number, phone, eplId, password } = req.body || {};
    const rawMobile = String(mobileNumber || number || phone || eplId || '').trim();
    const rawPassword = String(password || '').trim();

    if (!rawMobile || !rawPassword) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid mobile number or password.'
      });
    }

    const result = await verifyStaffCredentials(rawMobile, rawPassword);

    if (!result.success) {
      const statusCode = result.code === 'STAFF_NOT_FOUND' ? 404 : 401;
      return res.status(statusCode).json({
        success: false,
        code: result.code || 'INVALID_CREDENTIALS',
        message: result.message || 'Invalid mobile number or password.'
      });
    }

    const token = generateAuthToken({
      id: `staff-${result.eplId || rawMobile}`,
      userId: result.eplId || rawMobile,
      phone: result.number || rawMobile,
      email: result.email || `${result.eplId || 'staff'}@diblo.in`,
      role: result.role === 'Admin' ? 'ADMIN' : 'ASSISTANT',
      name: result.name || (result.role === 'Admin' ? 'Diblo Admin' : 'Field Assistant')
    });

    console.log(`[Cloud Function Staff Login Success] ${result.name} (${result.role}) via ${result.source}`);

    return res.json({
      success: true,
      role: result.role,
      eplId: result.eplId,
      name: result.name,
      number: result.number,
      email: result.email,
      token
    });
  } catch (err: any) {
    console.error('[Cloud Function Staff Login Error]:', err.message);
    return res.status(500).json({
      success: false,
      code: 'SERVER_CONFIG_ERROR',
      message: 'Staff login service is temporarily unavailable.'
    });
  }
});

// Staff Me endpoint
app.get(['/api/staff/me', '/staff/me'], (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  return res.json({
    success: true,
    user: decoded
  });
});

// Staff Logout endpoint
app.post(['/api/staff/logout', '/staff/logout'], (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Export Cloud Functions
export const api = onRequest({ cors: true, region: 'us-central1' }, app);
export const staffLogin = onRequest({ cors: true, region: 'us-central1' }, app);
