import crypto from 'crypto';
import Razorpay from 'razorpay';

export function getRazorpayClient(): {
  instance: Razorpay | null;
  keyId: string;
  isConfigured: boolean;
} {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      instance: null,
      keyId: keyId || 'rzp_test_diblo_mock_key',
      isConfigured: false
    };
  }

  try {
    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    return { instance, keyId, isConfigured: true };
  } catch (err) {
    console.error('[RAZORPAY] Failed to instantiate Razorpay client:', err);
    return {
      instance: null,
      keyId: keyId || 'rzp_test_diblo_mock_key',
      isConfigured: false
    };
  }
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt: string;
}> {
  const { instance, keyId, isConfigured } = getRazorpayClient();

  if (isConfigured && instance) {
    const order = await instance.orders.create({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes || {}
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      keyId,
      receipt: params.receipt
    };
  }

  // Safe fallback for dev/demo testing if keys are not provided
  const fallbackOrderId = `order_DBL_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  return {
    id: fallbackOrderId,
    amount: params.amountPaise,
    currency: 'INR',
    keyId: keyId || 'rzp_test_diblo_mock_key',
    receipt: params.receipt
  };
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    // In dev mode when secret is not configured, accept test signatures
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${params.orderId}|${params.paymentId}`);
    const generatedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(params.signature)
    );
  } catch (err) {
    console.error('[RAZORPAY] Signature verification error:', err);
    return false;
  }
}
