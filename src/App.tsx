import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider, useBooking } from './context/BookingContext';
import { GoogleMapsProvider } from './components/maps/GoogleMapsProvider';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { NotificationToast } from './components/common/NotificationToast';
import { CustomerHeader } from './components/customer/CustomerHeader';
import { CustomerBottomNav } from './components/customer/CustomerBottomNav';
import { CustomerHome } from './components/customer/CustomerHome';
import { CustomerBookings } from './components/customer/CustomerBookings';
import { ActiveBookingView } from './components/customer/ActiveBookingView';
import { CustomerProfile } from './components/customer/CustomerProfile';
import { CustomerSupport } from './components/customer/CustomerSupport';
import { BookingFlowModal } from './components/customer/BookingFlowModal';
import { LegalModal } from './components/customer/LegalModal';
import { AssistantPanel } from './components/assistant/AssistantPanel';
import { AdminPanel } from './components/admin/AdminPanel';
import { ServiceItem, Booking } from './types';

const MainAppContent: React.FC = () => {
  const { currentRole } = useAuth();
  const { setActiveBooking, bookings } = useBooking();

  // Customer Navigation Tab
  const [customerTab, setCustomerTab] = useState<'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT'>('HOME');

  // Booking Flow Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preSelectedService, setPreSelectedService] = useState<ServiceItem | null>(null);

  // Legal Modal State
  const [legalModalPage, setLegalModalPage] = useState<string | null>(null);

  const handleOpenBookingWithService = (service: ServiceItem) => {
    setPreSelectedService(service);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = (bookingId: string) => {
    const found = bookings.find((b) => b.id === bookingId);
    if (found) {
      setActiveBooking(found);
    }
    setCustomerTab('ACTIVITY');
  };

  const handleSelectBookingFromList = (booking: Booking) => {
    setActiveBooking(booking);
    setCustomerTab('ACTIVITY');
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
      {/* Top Floating / Fixed Role Switcher */}
      <RoleSwitcher />

      {/* Render Active View based on Current Role */}
      {currentRole === 'CUSTOMER' && (
        <>
          <CustomerHeader
            onOpenBooking={() => setIsBookingModalOpen(true)}
            onSelectTab={(tab) => setCustomerTab(tab)}
            activeTab={customerTab}
          />

          <main className="flex-1">
            {customerTab === 'HOME' && (
              <CustomerHome
                onSelectService={handleOpenBookingWithService}
                onOpenBooking={() => setIsBookingModalOpen(true)}
                onOpenLegal={(page) => setLegalModalPage(page)}
                onSelectTab={(tab) => setCustomerTab(tab)}
              />
            )}

            {customerTab === 'BOOKINGS' && (
              <CustomerBookings
                onSelectBooking={handleSelectBookingFromList}
                onOpenBooking={() => setIsBookingModalOpen(true)}
              />
            )}

            {customerTab === 'ACTIVITY' && (
              <ActiveBookingView
                onOpenBooking={() => setIsBookingModalOpen(true)}
                onSelectTab={(tab) => setCustomerTab(tab)}
              />
            )}

            {customerTab === 'PROFILE' && <CustomerProfile />}

            {customerTab === 'SUPPORT' && <CustomerSupport />}
          </main>

          {/* Customer Mobile Navigation */}
          <CustomerBottomNav
            activeTab={customerTab}
            onSelectTab={(tab) => setCustomerTab(tab)}
          />
        </>
      )}

      {currentRole === 'ASSISTANT' && <AssistantPanel />}

      {(currentRole === 'ADMIN' || currentRole === 'OPERATIONS') && <AdminPanel />}

      {/* Global Booking Flow Modal */}
      {isBookingModalOpen && (
        <BookingFlowModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setPreSelectedService(null);
          }}
          preSelectedService={preSelectedService}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Global Legal Policies Modal */}
      {legalModalPage && (
        <LegalModal
          isOpen={!!legalModalPage}
          onClose={() => setLegalModalPage(null)}
          page={legalModalPage}
        />
      )}

      {/* Global Realtime In-App Notification Toast */}
      <NotificationToast />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <GoogleMapsProvider>
          <MainAppContent />
        </GoogleMapsProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

export default App;
