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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 px-2 py-1.5 shadow-lg">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all relative ${
                isActive ? 'text-[#F42F73]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
