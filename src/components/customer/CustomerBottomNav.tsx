import React from 'react';
import { Home, Calendar, Activity, User, HelpCircle } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';

interface CustomerBottomNavProps {
  activeTab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT';
  onSelectTab: (tab: 'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT') => void;
}

export const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const { activeBooking } = useBooking();

  const navItems = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'BOOKINGS', label: 'Bookings', icon: Calendar },
    { id: 'ACTIVITY', label: 'Live Task', icon: Activity, badge: !!activeBooking },
    { id: 'SUPPORT', label: 'Support', icon: HelpCircle },
    { id: 'PROFILE', label: 'Profile', icon: User }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-xl border-t border-gray-200/80 px-1 pt-1.5 pb-2 sm:pb-1.5 shadow-xl">
      <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative min-h-[44px] ${
                isActive ? 'text-[#F42F73]' : 'text-gray-500 hover:text-gray-900 active:scale-95'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
