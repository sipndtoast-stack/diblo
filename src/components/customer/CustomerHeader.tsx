import React, { useState } from 'react';
import { MapPin, Shield, Phone, Bell, User, AlertTriangle, ChevronDown, Menu, X, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleTabClick = (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all">
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Location */}
        <div className="flex items-center gap-2 sm:gap-6">
          <div
            onClick={() => handleTabClick('HOME')}
            className="cursor-pointer flex items-baseline gap-1 select-none py-1"
          >
            <span className="text-2xl sm:text-3xl font-black text-[#F42F73] tracking-tighter lowercase">
              diblo
            </span>
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-[#FFF0F5] text-[#F42F73] px-1.5 py-0.5 rounded ml-1 hidden xs:inline-block">
              Mumbai
            </span>
          </div>

          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold text-[#14213D] transition-colors min-h-[36px]"
              aria-label="Select Operating Zone"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
              <span className="max-w-[100px] sm:max-w-[150px] md:max-w-[180px] truncate text-left">{selectedArea}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {isLocationDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
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
        <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold">
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
              className={`px-3.5 py-2 rounded-xl transition-all relative min-h-[40px] flex items-center ${
                activeTab === item.id
                  ? 'text-[#F42F73] bg-[#FFF0F5] font-bold'
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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active Booking Floating Chip (If booking in progress) */}
          {activeBooking && (
            <button
              onClick={() => onSelectTab('ACTIVITY')}
              className="hidden sm:flex items-center gap-2 bg-[#FFF0F5] border border-[#F42F73]/30 text-[#F42F73] px-3 py-1.5 rounded-full text-xs font-bold animate-pulse min-h-[36px]"
            >
              <span className="w-2 h-2 rounded-full bg-[#F42F73]" />
              <span className="hidden md:inline">Live: </span>
              <span>{activeBooking.status.replace('_', ' ')}</span>
            </button>
          )}

          {/* SOS Safety Button */}
          <button
            onClick={() => setShowSosModal(true)}
            className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all active:scale-95 min-h-[38px] min-w-[38px]"
            title="Emergency Safety & SOS"
            aria-label="Emergency SOS"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">SOS Desk</span>
          </button>

          {/* In-App PWA Install Quick Button */}
          <PWAInstallButton className="hidden md:inline-flex" />

          {/* Book Assistant Primary CTA */}
          <button
            onClick={onOpenBooking}
            className="bg-[#F42F73] hover:bg-[#D81B60] text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-[#F42F73]/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 min-h-[38px] whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 hidden xs:inline" />
            <span>Book Assistant</span>
          </button>

          {/* User Avatar Circle */}
          <button
            onClick={() => onSelectTab('PROFILE')}
            className="w-9 h-9 rounded-full bg-[#14213D] text-white text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-[#F42F73] transition-all shrink-0 min-w-[36px] min-h-[36px]"
            title="My Profile"
            aria-label="User Profile"
          >
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AK'}
          </button>

          {/* Mobile Menu Hamburger Button (Hidden on Desktop) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ml-0.5"
            aria-label="Open Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bg-white/98 backdrop-blur-xl border-b border-gray-200 shadow-2xl z-50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          {/* Mobile Zone Selector */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operating Area</div>
            <div className="grid grid-cols-2 gap-1.5">
              {mumbaiAreas.slice(0, 6).map((area) => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left truncate transition-colors ${
                    selectedArea === area
                      ? 'bg-[#F42F73] text-white font-bold'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {area.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Navigation List */}
          <div className="space-y-1">
            {[
              { id: 'HOME', label: 'Home Page' },
              { id: 'BOOKINGS', label: 'My Bookings & Receipts' },
              { id: 'ACTIVITY', label: 'Live Assistance & GPS' },
              { id: 'SUPPORT', label: 'Customer Helpdesk 24x7' },
              { id: 'PROFILE', label: 'My Profile & Addresses' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as any)}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-between transition-colors min-h-[44px] ${
                  activeTab === item.id
                    ? 'bg-[#FFF0F5] text-[#F42F73]'
                    : 'text-[#14213D] hover:bg-gray-50'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'ACTIVITY' && activeBooking && (
                  <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">LIVE</span>
                )}
              </button>
            ))}
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="pt-2 space-y-2 border-t border-gray-100">
            {/* Mobile PWA Install option */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FFF0F5] border border-[#F42F73]/20">
              <div className="flex items-center gap-2.5">
                <img src="/icon.svg" className="w-8 h-8 rounded-xl shrink-0" alt="Diblo" />
                <div className="text-left">
                  <div className="text-xs font-bold text-[#14213D]">Diblo App</div>
                  <div className="text-[10px] text-gray-500">Fast home screen access</div>
                </div>
              </div>
              <PWAInstallButton variant="compact" />
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 rounded-2xl bg-[#F42F73] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 min-h-[46px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book Assistant @ ₹149/hr</span>
            </button>

            <a
              href="tel:8291919829"
              className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#14213D] font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>24x7 Mumbai Helpline (8291919829)</span>
            </a>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/staff-login');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="w-full py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold text-xs flex items-center justify-center gap-2 min-h-[40px] transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[#14213D]" />
              <span>Staff / Employee Portal (/staff-login)</span>
            </button>
          </div>
        </div>
      )}

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
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                <span>Call Diblo Emergency Desk (8291919829)</span>
              </a>
              <a
                href="tel:112"
                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Shield className="w-4 h-4" />
                <span>Call Mumbai Police (112)</span>
              </a>
              <button
                onClick={() => setShowSosModal(false)}
                className="w-full py-2.5 text-xs text-gray-500 font-semibold hover:text-gray-800 min-h-[44px]"
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
