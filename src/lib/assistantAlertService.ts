/**
 * DIBLO Assistant Alert Service
 * Handles notification sound, vibration, browser/PWA notifications,
 * and duplicate alert prevention for new orders.
 */

let audioCtx: AudioContext | null = null;
let soundIntervalId: any = null;
let alertActive = false;
const alertedOrderIds = new Set<string>();

// Initialize Web Audio Context gracefully
function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    console.debug('[AlertService] AudioContext not available:', e);
    return null;
  }
}

/**
 * Play a crisp, pleasant 2-tone order alert chime using Web Audio API
 */
export function playAlertChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: 880 Hz (A5) - higher tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.debug('[AlertService] Failed to play audio alert:', e);
  }
}

/**
 * Trigger short mobile vibration pattern (non-continuous)
 */
export function triggerVibration(): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      // 2 short pulses with a pause: 200ms on, 100ms pause, 200ms on
      navigator.vibrate([200, 100, 200]);
    }
  } catch (e) {
    console.debug('[AlertService] Vibration unsupported or blocked:', e);
  }
}

/**
 * Trigger browser / PWA native notification if permission is granted
 */
export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const notifOptions: any = {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          ...options
        };
        const notif = new Notification(title, notifOptions);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    }
  } catch (e) {
    console.debug('[AlertService] Notification trigger error:', e);
  }
}

/**
 * Request notification permission safely
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/**
 * Check if alert has already been fired for this specific order
 */
export function hasOrderBeenAlerted(orderId: string): boolean {
  return alertedOrderIds.has(orderId);
}

/**
 * Start repeating new order alert (limited to 3 gentle chimes over 9 seconds)
 */
export function startNewOrderAlert(order: {
  id: string;
  customerName?: string;
  serviceName?: string;
  location?: { address?: string; area?: string };
  totalAmount?: number;
}): void {
  // Prevent duplicate alert for the same order
  if (alertedOrderIds.has(order.id)) return;
  alertedOrderIds.add(order.id);

  alertActive = true;

  // Immediate sound and vibration
  playAlertChime();
  triggerVibration();

  // Browser / PWA Notification
  const amountStr = order.totalAmount ? ` • ₹${order.totalAmount}` : '';
  const areaStr = order.location?.area || order.location?.address || 'Near you';
  showBrowserNotification('⚡ New DIBLO Order Available!', {
    body: `${order.serviceName || 'Assistance Request'} in ${areaStr}${amountStr}. Tap to open.`,
    tag: `diblo-order-${order.id}`,
    requireInteraction: true
  });

  // Repeat sound/vibe limited number of times (max 2 more times every 4 seconds)
  let count = 0;
  if (soundIntervalId) clearInterval(soundIntervalId);
  soundIntervalId = setInterval(() => {
    count++;
    if (!alertActive || count >= 2) {
      stopAlert();
      return;
    }
    playAlertChime();
    triggerVibration();
  }, 4000);
}

/**
 * Stop any currently running sound and vibration alert
 */
export function stopAlert(): void {
  alertActive = false;
  if (soundIntervalId) {
    clearInterval(soundIntervalId);
    soundIntervalId = null;
  }
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      navigator.vibrate(0); // Cancel ongoing vibration
    }
  } catch {}
}
