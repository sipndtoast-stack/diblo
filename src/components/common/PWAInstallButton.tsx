import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install, openPopup } = usePWAInstall();

  // If already installed or running as standalone, do not show install button
  if (isInstalled || isStandalone) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else {
      openPopup();
    }
  };

  if (variant === 'compact') {
    return (
      <button
        id="pwa-install-compact-btn"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFF0F5] hover:bg-[#ffe2ec] text-[#F42F73] border border-[#F42F73]/20 transition-all ${className}`}
        title="Install Diblo App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install</span>
      </button>
    );
  }

  return (
    <button
      id="pwa-install-header-btn"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#F42F73] to-[#FF387F] text-white shadow-sm hover:shadow-md hover:brightness-105 active:scale-95 transition-all min-h-[36px] ${className}`}
      title="Install Diblo to Home Screen"
    >
      <Download className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">Install App</span>
      <span className="sm:hidden">Install</span>
    </button>
  );
};
