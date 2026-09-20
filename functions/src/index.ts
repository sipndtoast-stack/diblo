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
