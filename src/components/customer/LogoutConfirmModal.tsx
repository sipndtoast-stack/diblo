import React from 'react';
import { LogOut, AlertCircle, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="logout-confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div
        id="logout-confirm-dialog"
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-150 text-[#14213D]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-[#F42F73] flex items-center justify-center mb-4">
            <LogOut className="w-6 h-6" />
          </div>

          <h3 id="logout-dialog-title" className="text-lg font-bold text-[#14213D]">
            Are you sure you want to logout?
          </h3>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            You will need to sign in again with your registered phone number to access your bookings and profile.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <button
              type="button"
              id="logout-confirm-cancel-btn"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              id="logout-confirm-submit-btn"
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs transition-all shadow-md shadow-[#F42F73]/20 cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
