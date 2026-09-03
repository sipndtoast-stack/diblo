import React, { useState, useEffect } from 'react';
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
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { AssistantPanel } from './components/assistant/AssistantPanel';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthLoadingScreen } from './components/auth/AuthLoadingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
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

      {/* Global PWA Install Popup */}
      <PWAInstallModal />
    </div>
  );
};

/**
 * AppRouter handles route protection and authentication gates:
 * 1. Loading state -> Shows AuthLoadingScreen
 * 2. Unauthenticated -> Forces redirect to /login and shows LoginScreen
 * 3. Authenticated -> Allows access to Home/Dashboard and redirects /login to /
 */
const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocationPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Track browser history / popstate
  useEffect(() => {
    const onPopState = () => {
      setLocationPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Route protection and URL redirection
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Unauthenticated users are redirected to /login
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        setLocationPath('/login');
      }
    } else {
      // Authenticated users on /login are redirected to /
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
        window.history.replaceState({}, '', '/');
        setLocationPath('/');
      }
    }
  }, [isAuthenticated, isLoading]);

  // 1. Auth Loading: Show clean branded splash loading
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // 2. Unauthenticated: Render responsive Login / Sign Up screen exclusively
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <LoginScreen />
        <PWAInstallModal />
      </div>
    );
  }

  // 3. Authenticated: Render protected MainAppContent
  return <MainAppContent />;
};

export function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <GoogleMapsProvider>
          <AppRouter />
        </GoogleMapsProvider>
      </BookingProvider>
    </AuthProvider>
  );
}

export default App;
