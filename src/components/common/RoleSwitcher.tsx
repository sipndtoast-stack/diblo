import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { User, ShieldCheck, Briefcase, RotateCcw, Sparkles, LogOut } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, switchRole, currentUser, logout } = useAuth();
  const { refreshBookings } = useBooking();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const roles: { role: UserRole; label: string; shortLabel: string; icon: React.ElementType }[] = [
    {
      role: 'CUSTOMER',
      label: 'Customer Panel',
      shortLabel: 'Customer',
      icon: User
    },
    {
      role: 'ASSISTANT',
      label: 'Assistant Panel',
      shortLabel: 'Assistant',
      icon: Briefcase
    },
    {
      role: 'ADMIN',
      label: 'Admin Operations',
      shortLabel: 'Admin',
      icon: ShieldCheck
    }
  ];

  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      await api.resetSeedData();
      await refreshBookings();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-[#14213D] text-white border-b border-gray-800 text-xs py-1.5 px-2.5 sm:px-6">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5">
        {/* Left: Role Switcher Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className="items-center gap-1 text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1 hidden lg:flex">
            <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Role:</span>
          </div>

          <div className="flex items-center bg-black/30 p-0.5 sm:p-1 rounded-xl border border-white/10 gap-0.5 sm:gap-1">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => switchRole(r.role)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg font-bold text-xs transition-all min-h-[34px] ${
                    isActive
                      ? 'bg-[#F42F73] text-white shadow-xs'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                  aria-label={r.label}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{r.label}</span>
                  <span className="sm:hidden">{r.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Identity Info + Quick Demo Reset */}
        <div className="flex items-center gap-2 ml-auto text-[11px]">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Logged in as: <strong className="text-white">{currentUser?.name}</strong> (+91 {currentUser?.phone})</span>
          </div>

          <button
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-gray-200 px-2 sm:px-2.5 py-1 rounded-lg transition-colors text-[10px] sm:text-[11px] font-medium border border-white/10 min-h-[32px]"
            title="Reset DB with realistic Mumbai bookings & assistants"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{resetSuccess ? 'Done!' : 'Reset Demo'}</span>
          </button>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white px-2 sm:px-2.5 py-1 rounded-lg transition-colors text-[10px] sm:text-[11px] font-semibold border border-red-500/30 min-h-[32px]"
            title="Log out and return to Login Screen"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden xs:inline">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
