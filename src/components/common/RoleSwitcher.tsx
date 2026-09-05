import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { api } from '../../lib/api';
import { User, ShieldCheck, Briefcase, RotateCcw, Sparkles, LogOut, Lock } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, switchRole, currentUser, staffUser, logoutStaff } = useAuth();
  const { refreshBookings } = useBooking();
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleRoleSelect = (targetRole: UserRole) => {
    if (targetRole === 'CUSTOMER') {
      switchRole('CUSTOMER');
      navigateTo('/customer');
      return;
    }

    if (targetRole === 'ASSISTANT') {
      if (staffUser && (staffUser.role === 'Assistant' || staffUser.role === 'Admin')) {
        switchRole('ASSISTANT');
        navigateTo('/assistant');
      } else {
        navigateTo('/staff-login');
      }
      return;
    }

    if (targetRole === 'ADMIN' || targetRole === 'OPERATIONS') {
      if (staffUser && staffUser.role === 'Admin') {
        switchRole('ADMIN');
        navigateTo('/admin');
      } else if (staffUser && staffUser.role === 'Assistant') {
        window.dispatchEvent(
          new CustomEvent('diblo-access-denied', {
            detail: 'Access denied. Admin access required.'
          })
        );
        navigateTo('/assistant');
      } else {
        navigateTo('/staff-login');
      }
      return;
    }
  };

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
        {/* Left: Role Selection & Route Shortcuts */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <div className="items-center gap-1 text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1 hidden lg:flex">
            <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Portal:</span>
          </div>

          <div className="flex items-center bg-black/30 p-0.5 sm:p-1 rounded-xl border border-white/10 gap-0.5 sm:gap-1">
            {/* Customer Button */}
            <button
              onClick={() => handleRoleSelect('CUSTOMER')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs transition-all min-h-[34px] ${
                currentRole === 'CUSTOMER'
                  ? 'bg-[#F42F73] text-white shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Customer</span>
            </button>

            {/* Assistant Button */}
            <button
              onClick={() => handleRoleSelect('ASSISTANT')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs transition-all min-h-[34px] ${
                currentRole === 'ASSISTANT'
                  ? 'bg-[#F42F73] text-white shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Assistant</span>
              {!staffUser && <Lock className="w-3 h-3 text-gray-400 ml-0.5" />}
            </button>

            {/* Admin Button */}
            <button
              onClick={() => handleRoleSelect('ADMIN')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs transition-all min-h-[34px] ${
                currentRole === 'ADMIN'
                  ? 'bg-[#F42F73] text-white shadow-xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
              {(!staffUser || staffUser.role !== 'Admin') && <Lock className="w-3 h-3 text-gray-400 ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Right: Staff Identity or Login Link */}
        <div className="flex items-center gap-2 ml-auto text-[11px]">
          {staffUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-950/60 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Staff: <strong>{staffUser.name}</strong> ({staffUser.eplId}) • {staffUser.role}
                </span>
              </div>
              <button
                onClick={() => logoutStaff()}
                className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-400/30 font-semibold transition-colors"
                title="Log out of Staff Portal"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigateTo('/staff-login')}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-1 rounded-lg border border-white/10 font-semibold transition-colors"
            >
              <Lock className="w-3 h-3 text-[#F42F73]" />
              <span>Staff Login</span>
            </button>
          )}

          {/* Reset Demo State Button */}
          <button
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded-lg transition-colors text-[10px] font-medium border border-white/5 min-h-[30px]"
            title="Reset DB with realistic Mumbai bookings & assistants"
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{resetSuccess ? 'Done!' : 'Reset Demo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
