import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, PlusSquare, ArrowDown, Download, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  customTrigger?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = () => {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    showPopup,
    isInstalling,
    install,
    dismiss,
    closePopup,
  } = usePWAInstall();

  // If already installed or running as standalone, never render the popup
  if (isInstalled || isStandalone) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPopup && (
        <div
          id="pwa-install-modal-wrapper"
          className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop with subtle blur */}
          <motion.div
            id="pwa-install-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Clean White Card with Rounded Corners */}
          <motion.div
            id="pwa-install-card"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-7 overflow-hidden z-10"
          >
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF387F] via-[#F42F73] to-[#D8175A]" />

            {/* Close 'X' button */}
            <button
              id="pwa-modal-close-button"
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close install prompt"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Centered Diblo App Icon & Branding */}
            <div className="flex flex-col items-center text-center mt-1">
              {/* Diblo App Icon */}
              <div
                id="pwa-app-icon-container"
                className="relative w-20 h-20 rounded-2xl p-1.5 bg-gradient-to-tr from-[#F42F73] to-[#FF6B8B] shadow-lg shadow-[#F42F73]/25 mb-3.5 flex items-center justify-center"
              >
                <img
                  src="/icon.svg"
                  alt="Diblo App Icon"
                  className="w-full h-full object-contain rounded-xl drop-shadow"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F42F73] opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F42F73] border-2 border-white" />
                </span>
              </div>

              {/* App Name */}
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFF0F5] border border-[#F42F73]/20 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F42F73]" />
                <span className="text-xs font-black text-[#F42F73] tracking-wide uppercase">
                  Diblo
                </span>
                <span className="text-[10px] text-gray-500 font-semibold">• Mumbai</span>
              </div>

              {/* Heading */}
              <h3
                id="pwa-install-heading"
                className="text-xl sm:text-2xl font-black text-[#14213D] tracking-tight"
              >
                Install Diblo App
              </h3>

              {/* Short Description */}
              <p
                id="pwa-install-description"
                className="text-sm text-gray-600 font-medium mt-1.5 max-w-xs leading-relaxed"
              >
                Get quick access to Diblo from your home screen.
              </p>
            </div>

            {/* Feature Highlights Pills */}
            <div className="mt-4 pt-3.5 pb-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                <div className="text-[11px] font-bold text-[#14213D]">Instant Access</div>
                <div className="text-[10px] text-gray-500">1-tap launch</div>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                <div className="text-[11px] font-bold text-[#14213D]">Fast & Offline</div>
                <div className="text-[10px] text-gray-500">Zero loading lag</div>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100">
                <div className="text-[11px] font-bold text-[#14213D]">Full Screen</div>
                <div className="text-[10px] text-gray-500">Native app feel</div>
              </div>
            </div>

            {/* Platform-Specific Section */}
            <div className="mt-4">
              {isInstallable ? (
                /* Native PWA Installation Available (Chromium, Android, Chrome/Edge Desktop) */
                <div className="space-y-2.5">
                  <button
                    id="pwa-native-install-button"
                    onClick={install}
                    disabled={isInstalling}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#F42F73] hover:bg-[#d8175a] active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#F42F73]/30 transition-all text-base disabled:opacity-75 cursor-pointer"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>{isInstalling ? 'Installing Diblo...' : 'Install'}</span>
                  </button>

                  <button
                    id="pwa-dismiss-button"
                    onClick={dismiss}
                    className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              ) : isIOS ? (
                /* iOS Safari Guided Flow: beforeinstallprompt is not supported on WebKit */
                <div className="space-y-3">
                  <div
                    id="pwa-ios-instructions-box"
                    className="bg-[#FFF0F5] border border-[#F42F73]/20 rounded-2xl p-4 text-left"
                  >
                    <div className="text-xs font-bold text-[#F42F73] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>iOS Safari Installation</span>
                    </div>
                    <p className="text-sm font-semibold text-[#14213D] leading-snug">
                      To install Diblo, tap <span className="inline-flex items-center gap-1 font-bold text-[#F42F73]"><Share2 className="w-3.5 h-3.5 inline" /> Share</span> → <span className="inline-flex items-center gap-1 font-bold text-[#14213D]"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</span>.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-gray-500">
                      <ArrowDown className="w-3.5 h-3.5 text-[#F42F73] animate-pulse" />
                      <span>Look for the Share icon in your Safari navigation bar.</span>
                    </div>
                  </div>

                  <button
                    id="pwa-ios-got-it-button"
                    onClick={dismiss}
                    className="w-full bg-[#14213D] hover:bg-[#1f3158] active:scale-[0.98] text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all text-sm cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              ) : (
                /* Non-supported / Desktop browser without prompt event */
                <div className="space-y-3">
                  <div
                    id="pwa-desktop-guide-box"
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left text-xs text-gray-600"
                  >
                    <div className="font-bold text-[#14213D] mb-1 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-[#F42F73]" />
                      <span>Browser Installation</span>
                    </div>
                    <p>
                      Click the <strong>Install</strong> icon in your browser address bar or menu to add Diblo to your device.
                    </p>
                  </div>

                  <button
                    id="pwa-fallback-dismiss-button"
                    onClick={dismiss}
                    className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
