import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { Users, User, ShieldCheck, Briefcase, RotateCcw, Check, Sparkles, PhoneCall } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, switchRole, currentUser } = useAuth();
  const { refreshBookings } = useBooking();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const roles: { role: UserRole; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    {
      role: 'CUSTOMER',
      label: 'Customer Panel',
      icon: User,
      color: '#F42F73',
      desc: 'Book verified assistants @ ₹149/hr'
    },
    {
      role: 'ASSISTANT',
      label: 'Assistant Panel',
      icon: Briefcase,
      color: '#10B981',
      desc: 'Accept tasks, verify OTP & navigate'
    },
    {
      role: 'ADMIN',
      label: 'Admin Operations',
      icon: ShieldCheck,
      color: '#14213D',
      desc: 'Live map, bookings, societies, pricing'
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
    <div className="bg-[#14213D] text-white border-b border-gray-800 text-xs py-2 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Role Switcher Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1 hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Role Switcher:</span>
          </div>

          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-white/10 gap-1">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => switchRole(r.role)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-[#F42F73] text-white shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Identity Info + Quick Demo Reset */}
        <div className="flex items-center gap-3 ml-auto text-[11px]">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Logged in as: <strong className="text-white">{currentUser?.name}</strong> (+91 {currentUser?.phone})</span>
          </div>

          <button
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-1 rounded-lg transition-colors text-[11px] font-medium border border-white/10"
            title="Reset DB with realistic Mumbai bookings & assistants"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{resetSuccess ? 'Reset Done!' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
