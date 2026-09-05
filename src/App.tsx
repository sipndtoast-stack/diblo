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
import { StaffLogin } from './components/auth/StaffLogin';
import { AccessSelection } from './components/auth/AccessSelection';
import { ServiceItem, Booking } from './types';
import { AlertCircle, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { staffUser, switchRole } = useAuth();
  const { setActiveBooking, bookings } = useBooking();

  // Current URL Path state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Access denied notification banner
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Customer Navigation Tab
  const [customerTab, setCustomerTab] = useState<'HOME' | 'BOOKINGS' | 'ACTIVITY' | 'PROFILE' | 'SUPPORT'>('HOME');

  // Booking Flow Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preSelectedService, setPreSelectedService] = useState<ServiceItem | null>(null);

  // Legal Modal State
  const [legalModalPage, setLegalModalPage] = useState<string | null>(null);

  // Helper for navigating paths without full reload
  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Synchronize browser history and path changes
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname || '/';
        // Normalize legacy auth URLs to root
        if (path === '/login' || path === '/signup') {
          window.history.replaceState({}, '', '/');
          setCurrentPath('/');
        } else {
          setCurrentPath(path);
        }
      }
    };

    const handleAccessDeniedEvent = (e: any) => {
      const msg = e.detail || 'Access denied. Admin access required.';
      setAccessDeniedNotice(msg);
      setTimeout(() => {
        setAccessDeniedNotice(null);
      }, 5000);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('diblo-access-denied', handleAccessDeniedEvent);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('diblo-access-denied', handleAccessDeniedEvent);
    };
  }, []);

  // ROUTE PROTECTION RULES & REDIRECT LOGIC
  useEffect(() => {
    // 1. /assistant: Protected. Allowed Role: Assistant (or Admin). Unauthenticated -> /staff-login
    if (currentPath === '/assistant') {
      if (!staffUser || !staffUser.authenticated) {
        navigateTo('/staff-login');
      } else {
        switchRole('ASSISTANT');
      }
    }

    // 2. /admin: Protected. Allowed Role: Admin only.
    // If not logged in -> /staff-login
    // If logged in as Assistant -> Deny access, redirect to /assistant, show error
    if (currentPath === '/admin') {
      if (!staffUser || !staffUser.authenticated) {
        navigateTo('/staff-login');
      } else if (staffUser.role !== 'Admin') {
        setAccessDeniedNotice('Access denied. Admin access required.');
        navigateTo('/assistant');
      } else {
        switchRole('ADMIN');
      }
    }

    // 3. /customer: Public Customer Route
    if (currentPath === '/customer') {
      switchRole('CUSTOMER');
    }
  }, [currentPath, staffUser]);

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

  // VIEW 1: FIRST SCREEN — ACCESS SELECTION (/)
  if (currentPath === '/') {
    return (
      <AccessSelection
        onSelectCustomer={() => navigateTo('/customer')}
        onSelectStaff={() => navigateTo('/staff-login')}
      />
    );
  }

  // VIEW 2: STAFF LOGIN PAGE (/staff-login)
  if (currentPath === '/staff-login') {
    return (
      <StaffLogin
        onSuccess={(role) => {
          if (role === 'Admin') {
            navigateTo('/admin');
          } else {
            navigateTo('/assistant');
          }
        }}
        onBackToSelection={() => {
          navigateTo('/');
        }}
      />
    );
  }

  // VIEW 2: ASSISTANT PANEL (/assistant)
  if (currentPath === '/assistant') {
    if (!staffUser || !staffUser.authenticated) {
      return null;
    }
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
        <RoleSwitcher />
        {accessDeniedNotice && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-rose-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{accessDeniedNotice}</span>
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="ml-auto p-1 text-rose-600 hover:text-rose-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <AssistantPanel />
        <NotificationToast />
      </div>
    );
  }

  // VIEW 3: ADMIN PANEL (/admin)
  if (currentPath === '/admin') {
    if (!staffUser || !staffUser.authenticated || staffUser.role !== 'Admin') {
      return null;
    }
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
        <RoleSwitcher />
        <AdminPanel />
        <NotificationToast />
      </div>
    );
  }

  // VIEW 4: CUSTOMER PANEL (DEFAULT /)
  // Public access: No login required, opens directly!
  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
      {/* Top Portal Switcher */}
      <RoleSwitcher />

      {/* Customer Header */}
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
