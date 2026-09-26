import React from 'react';
import { Home, Calendar, Activity, User, Heart } from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';

interface CustomerBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const { activeBooking } = useBooking();
  const { favoriteAssistantIds } = useAuth();

  const navItems = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'REQUESTS', label: 'Requests', icon: Calendar, alias: 'BOOKINGS' },
    { id: 'TRACK', label: 'Live Task', icon: Activity, badge: !!activeBooking, alias: 'ACTIVITY' },
    { id: 'FAVORITES', label: 'Saved', icon: Heart, count: favoriteAssistantIds.length },
    { id: 'PROFILE', label: 'Profile', icon: User }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-xl border-t border-gray-200/80 px-1 pt-1.5 pb-2 sm:pb-1.5 shadow-xl">
      <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.alias && activeTab === item.alias);
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative min-h-[44px] cursor-pointer ${
                isActive ? 'text-[#F42F73]' : 'text-gray-500 hover:text-gray-900 active:scale-95'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] fill-[#F42F73]/15' : 'stroke-[1.75]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-white animate-pulse" />
                )}
                {item.id === 'FAVORITES' && (item.count || 0) > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#F42F73] text-white text-[9px] font-black px-1 rounded-full leading-tight">
                    {item.count}
                  </span>
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
