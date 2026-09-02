import React, { useState } from 'react';
import { MapPin, Shield, Phone, Bell, User, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';

interface CustomerHeaderProps {
  onOpenBooking: () => void;
  onSelectTab: (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT') => void;
  activeTab: string;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ onOpenBooking, onSelectTab, activeTab }) => {
  const { currentUser } = useAuth();
  const { activeBooking } = useBooking();
  const [selectedArea, setSelectedArea] = useState('Bandra West, Mumbai');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  const mumbaiAreas = [
    'Bandra West, Mumbai',
    'Andheri West, Mumbai',
    'Powai, Mumbai',
    'Colaba & South Mumbai',
    'Dadar & Prabhadevi',
    'Juhu, Mumbai',
    'Thane West',
    'Lower Parel, Mumbai'
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onSelectTab('HOME')}
            className="cursor-pointer flex items-baseline gap-1 select-none"
          >
            <span className="text-2xl sm:text-3xl font-black text-[#F42F73] tracking-tighter lowercase">
              diblo
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold text-[#14213D] uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">
              Mumbai
            </span>
          </div>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-[#14213D] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{selectedArea}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isLocationDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  Select Mumbai Operating Zone
                </div>
                {mumbaiAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => {
                      setSelectedArea(area);
                      setIsLocationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-[#FFF0F5] hover:text-[#F42F73] transition-colors flex items-center justify-between ${
                      selectedArea === area ? 'text-[#F42F73] font-bold bg-[#FFF0F5]/50' : 'text-gray-700'
                    }`}
                  >
                    <span>{area}</span>
                    {selectedArea === area && <span className="text-[#F42F73] text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          {[
            { id: 'HOME', label: 'Home' },
            { id: 'BOOKINGS', label: 'My Bookings' },
            { id: 'ACTIVITY', label: 'Live Assistance' },
            { id: 'SUPPORT', label: 'Support' },
            { id: 'PROFILE', label: 'Profile' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as any)}
              className={`px-3.5 py-2 rounded-xl transition-all relative ${
                activeTab === item.id
                  ? 'text-[#F42F73] bg-[#FFF0F5]'
                  : 'text-gray-600 hover:text-[#14213D] hover:bg-gray-50'
              }`}
            >
              <span>{item.label}</span>
              {item.id === 'ACTIVITY' && activeBooking && (
                <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              )}
            </button>
          ))}
        </nav>

        {/* Right CTA & Emergency Safety Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Active Booking Floating Chip (If booking in progress) */}
          {activeBooking && (
            <button
              onClick={() => onSelectTab('ACTIVITY')}
              className="hidden sm:flex items-center gap-2 bg-[#FFF0F5] border border-[#F42F73]/30 text-[#F42F73] px-3.5 py-1.5 rounded-full text-xs font-bold animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-[#F42F73]" />
              <span>Live: {activeBooking.status.replace('_', ' ')}</span>
            </button>
          )}

          {/* SOS Safety Button */}
          <button
            onClick={() => setShowSosModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all active:scale-95"
            title="Emergency Safety & SOS"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SOS Desk</span>
          </button>

          {/* Book Assistant Primary CTA */}
          <button
            onClick={onOpenBooking}
            className="bg-[#F42F73] hover:bg-[#D81B60] text-white px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-[#F42F73]/25 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Book an Assistant</span>
          </button>

          {/* Geometric User Avatar Circle */}
          <button
            onClick={() => onSelectTab('PROFILE')}
            className="w-9 h-9 rounded-full bg-[#14213D] text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-[#F42F73] transition-all shrink-0 ml-1"
            title="My Profile"
          >
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AK'}
          </button>
        </div>
      </div>

      {/* SOS Emergency Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-red-100">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#14213D]">Diblo 24x7 Safety & SOS</h3>
              <p className="text-xs text-gray-500 mt-1">
                Direct helpline to Mumbai Police Control Room and Diblo Emergency Response Team.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="tel:8291919829"
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Diblo Emergency Desk (8291919829)</span>
              </a>
              <a
                href="tel:112"
                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Call Mumbai Police (112)</span>
              </a>
              <button
                onClick={() => setShowSosModal(false)}
                className="w-full py-2.5 text-xs text-gray-500 font-semibold hover:text-gray-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
