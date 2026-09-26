import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, X, Sparkles, WifiOff, Wifi } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';

export const NotificationToast: React.FC = () => {
  const { notifications, markNotificationRead } = useBooking();
  const unreadNotifs = notifications.filter((n) => !n.isRead).slice(0, 2);

  const [connectionState, setConnectionState] = useState<'IDLE' | 'RECONNECTING' | 'CONNECTED'>('IDLE');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      if (timer) clearTimeout(timer);
      setConnectionState('RECONNECTING');
    };

    const handleOnline = () => {
      setConnectionState((prev) => {
        if (prev === 'RECONNECTING') {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => setConnectionState('IDLE'), 3000);
          return 'CONNECTED';
        }
        return prev;
      });
    };

    const handleFirebaseConn = (e: Event) => {
      const custom = e as CustomEvent<{ connected: boolean }>;
      if (custom.detail?.connected === false) {
        handleOffline();
      } else if (custom.detail?.connected === true) {
        handleOnline();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('diblo-firebase-connection', handleFirebaseConn as EventListener);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('diblo-firebase-connection', handleFirebaseConn as EventListener);
    };
  }, []);

  if (unreadNotifs.length === 0 && connectionState === 'IDLE') return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-[990] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {connectionState === 'RECONNECTING' && (
          <motion.div
            key="conn-reconnecting"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto bg-amber-950/95 text-amber-100 px-3.5 py-2.5 rounded-2xl shadow-lg border border-amber-500/40 flex items-center gap-2.5 text-xs font-bold"
          >
            <WifiOff className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>Connection interrupted. Reconnecting…</span>
          </motion.div>
        )}

        {connectionState === 'CONNECTED' && (
          <motion.div
            key="conn-connected"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto bg-emerald-950/95 text-emerald-100 px-3.5 py-2.5 rounded-2xl shadow-lg border border-emerald-500/40 flex items-center gap-2.5 text-xs font-bold"
          >
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Connected</span>
          </motion.div>
        )}

        {unreadNotifs.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="pointer-events-auto bg-[#14213D] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-start gap-3 relative overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F42F73]/20 text-[#F42F73] flex items-center justify-center shrink-0 border border-[#F42F73]/30">
              {n.type === 'ASSISTANT' ? (
                <Sparkles className="w-5 h-5 text-[#F42F73]" />
              ) : n.type === 'BOOKING' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Bell className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="flex-1 pr-4">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{n.title}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#F42F73] animate-pulse" />
              </div>
              <div className="text-xs text-gray-300 mt-0.5 leading-relaxed">{n.message}</div>
            </div>

            <button
              onClick={() => markNotificationRead(n.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Subtle bottom progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F42F73]/40" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
