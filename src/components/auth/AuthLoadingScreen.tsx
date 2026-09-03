import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      id="auth-loading-screen"
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] text-[#14213D] px-4 select-none"
    >
      <div className="relative flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Animated Brand Logo Glow */}
        <div className="relative">
          <div className="absolute -inset-3 bg-[#F42F73]/15 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center p-3">
            <img
              src="/icon.svg"
              alt="Diblo"
              className="w-14 h-14 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F42F73]">
            <ShieldCheck className="w-4 h-4" />
            <span>Diblo Mumbai</span>
          </div>
          <h1 className="text-2xl font-black text-[#14213D] tracking-tight">
            Verifying Session
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Jahan Zarurat, Wahan Diblo
          </p>
        </div>

        {/* Loading Spinner & Status */}
        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-xs text-xs text-gray-600 font-medium">
          <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin" />
          <span>Securing your connection...</span>
        </div>
      </div>
    </div>
  );
};
