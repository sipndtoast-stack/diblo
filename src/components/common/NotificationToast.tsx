import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertCircle, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';

export const NotificationToast: React.FC = () => {
  const { notifications, markNotificationRead } = useBooking();
  const unreadNotifs = notifications.filter((n) => !n.isRead).slice(0, 2);

  if (unreadNotifs.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 z-[990] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
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
