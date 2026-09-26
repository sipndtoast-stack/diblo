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
import { StaffLogin } from './components/auth/StaffLogin';
import { AccessSelection } from './components/auth/AccessSelection';
import { CustomerLogin } from './components/auth/CustomerLogin';
import { UnifiedLogin } from './components/auth/UnifiedLogin';
import { AssistantOnboarding } from './components/assistant/AssistantOnboarding';
import { CustomerFavoritesView } from './components/customer/CustomerFavoritesView';
import { ServiceItem, Booking, AssistantProfile } from './types';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { PostBookingFeedbackModal } from './components/customer/PostBookingFeedbackModal';
import { AssistantPanel } from './components/assistant/AssistantPanel';
import { AdminPanel } from './components/admin/AdminPanel';
import { CustomerSidebar } from './components/customer/CustomerSidebar';
import { CustomerNotificationsView } from './components/customer/CustomerNotificationsView';
import { CustomerPaymentsView } from './components/customer/CustomerPaymentsView';
import { LogoutConfirmModal } from './components/customer/LogoutConfirmModal';

export type CustomerTabType =
  | 'HOME'
  | 'REQUESTS'
  | 'BOOKINGS'
  | 'TRACK'
  | 'ACTIVITY'
  | 'PROFILE'
  | 'NOTIFICATIONS'
  | 'PAYMENTS'
  | 'SUPPORT'
  | 'FAVORITES';

const getTabFromPath = (path: string): CustomerTabType => {
  if (path.includes('/requests') || path.includes('/bookings')) return 'REQUESTS';
  if (path.includes('/track') || path.includes('/activity')) return 'TRACK';
  if (path.includes('/profile')) return 'PROFILE';
  if (path.includes('/notifications')) return 'NOTIFICATIONS';
  if (path.includes('/payments')) return 'PAYMENTS';
  if (path.includes('/support')) return 'SUPPORT';
  if (path.includes('/favorites')) return 'FAVORITES';
  return 'HOME';
};

const MainAppContent: React.FC = () => {
  const { staffUser, switchRole, isCustomerAuthenticated, isAuthLoading, logoutCustomer } = useAuth();
  const { setActiveBooking, bookings, completedFeedbackBooking, dismissFeedbackModal } = useBooking();

  // Current URL Path state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  // Access denied notification banner
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<string | null>(null);

  // Customer Navigation Tab with URL preservation
  const [customerTab, setCustomerTab] = useState<CustomerTabType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      if (path.startsWith('/customer')) {
        return getTabFromPath(path);
      }
    }
    return 'HOME';
  });

  // Logout Confirmation Dialog State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Booking Flow Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preSelectedService, setPreSelectedService] = useState<ServiceItem | null>(null);
  const [preSelectedAssistant, setPreSelectedAssistant] = useState<AssistantProfile | null>(null);
  const [preSelectedCouponCode, setPreSelectedCouponCode] = useState<string | null>(null);

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

  // Handle Tab Switch and sync URL path so refreshing preserves location
  const handleCustomerTabChange = (tab: any) => {
    setCustomerTab(tab);
    let path = '/customer';
    if (tab === 'REQUESTS' || tab === 'BOOKINGS') path = '/customer/requests';
    else if (tab === 'TRACK' || tab === 'ACTIVITY') path = '/customer/track';
    else if (tab === 'PROFILE') path = '/customer/profile';
    else if (tab === 'NOTIFICATIONS') path = '/customer/notifications';
    else if (tab === 'PAYMENTS') path = '/customer/payments';
    else if (tab === 'SUPPORT') path = '/customer/support';
    else if (tab === 'FAVORITES') path = '/customer/favorites';

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  // Handle Confirmed Logout: clear session and return to entry / login screen
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutCustomer();
      setShowLogoutConfirm(false);
      navigateTo('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
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
          if (path.startsWith('/customer')) {
            setCustomerTab(getTabFromPath(path));
          }
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

    // 3. /customer: Protected Customer Route
    // If authenticated: switch role to CUSTOMER
    // If not authenticated (and auth is loaded): redirect to /customer-login
    if (currentPath.startsWith('/customer')) {
      if (!isAuthLoading) {
        if (!isCustomerAuthenticated) {
          navigateTo('/customer-login');
        } else {
          switchRole('CUSTOMER');
          setCustomerTab(getTabFromPath(currentPath));
        }
      }
    }

    // 4. If already authenticated with Firebase, restore session and open Customer Panel
    if (!isAuthLoading && isCustomerAuthenticated) {
      if (currentPath === '/' || currentPath === '/customer-login') {
        navigateTo('/customer');
      }
    }
  }, [currentPath, staffUser, isCustomerAuthenticated, isAuthLoading]);

  const handleOpenBookingWithService = (service: ServiceItem) => {
    setPreSelectedService(service);
    setIsBookingModalOpen(true);
  };

  const handleOpenBookingWithAssistant = (assistant: AssistantProfile) => {
    setPreSelectedAssistant(assistant);
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

  // VIEW 1: FIRST SCREEN — UNIFIED LOGIN (/)
  if (currentPath === '/') {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F42F73]" />
        </div>
      );
    }
    return (
      <UnifiedLogin
        initialMode="CUSTOMER"
        onCustomerSuccess={() => {
          navigateTo('/customer');
        }}
        onStaffSuccess={(role) => {
          if (role === 'Admin') {
            navigateTo('/admin');
          } else {
            navigateTo('/assistant');
          }
        }}
        onApplyAssistant={() => {
          navigateTo('/apply-assistant');
        }}
      />
    );
  }

  // VIEW 1.5: CUSTOMER OTP LOGIN (/customer-login)
  if (currentPath === '/customer-login') {
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#F42F73]" />
        </div>
      );
    }
    return (
      <UnifiedLogin
        initialMode="CUSTOMER"
        onCustomerSuccess={() => {
          navigateTo('/customer');
        }}
        onStaffSuccess={(role) => {
          if (role === 'Admin') {
            navigateTo('/admin');
          } else {
            navigateTo('/assistant');
          }
        }}
        onApplyAssistant={() => {
          navigateTo('/apply-assistant');
        }}
      />
    );
  }

  // VIEW 1.8: NEW ASSISTANT MULTI-STEP ONBOARDING (/apply-assistant)
  if (currentPath === '/apply-assistant') {
    return (
      <AssistantOnboarding
        onSuccess={() => {
          navigateTo('/assistance-login');
        }}
        onBackToSelection={() => {
          navigateTo('/assistance-login');
        }}
      />
    );
  }

  // VIEW 2: ASSISTANCE LOGIN PAGE (/assistance-login or /staff-login)
  if (currentPath === '/assistance-login' || currentPath === '/staff-login') {
    return (
      <UnifiedLogin
        initialMode="STAFF"
        onCustomerSuccess={() => {
          navigateTo('/customer');
        }}
        onStaffSuccess={(role) => {
          if (role === 'Admin') {
            navigateTo('/admin');
          } else {
            navigateTo('/assistant');
          }
        }}
        onApplyAssistant={() => {
          navigateTo('/apply-assistant');
        }}
        onBackToCustomer={() => {
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
        <React.Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#F42F73]" />
            </div>
          }
        >
          <AssistantPanel />
        </React.Suspense>
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
        <React.Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center p-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#F42F73]" />
            </div>
          }
        >
          <AdminPanel />
        </React.Suspense>
        <NotificationToast />
      </div>
    );
  }

  // VIEW 4: CUSTOMER PANEL (/customer)
  // Protected Customer Route: Authenticated with Firebase Phone Auth
  if (!isAuthLoading && !isCustomerAuthenticated) {
    return (
      <UnifiedLogin
        initialMode="CUSTOMER"
        onCustomerSuccess={() => {
          navigateTo('/customer');
        }}
        onStaffSuccess={(role) => {
          if (role === 'Admin') {
            navigateTo('/admin');
          } else {
            navigateTo('/assistant');
          }
        }}
        onApplyAssistant={() => {
          navigateTo('/apply-assistant');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
      {/* Desktop Customer Sidebar (Visible on Desktop >= lg, left side, Diblo logo + 8 navigation items) */}
      <CustomerSidebar
        activeTab={customerTab}
        onSelectTab={(tab) => handleCustomerTabChange(tab)}
        onOpenLogout={() => setShowLogoutConfirm(true)}
        onOpenBooking={() => {
          setPreSelectedAssistant(null);
          setIsBookingModalOpen(true);
        }}
      />

      {/* Main Content View (Header + Active Tab Content) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Customer Header */}
        <CustomerHeader
          onOpenBooking={() => setIsBookingModalOpen(true)}
          onSelectTab={(tab) => handleCustomerTabChange(tab)}
          activeTab={customerTab}
          onOpenLogout={() => setShowLogoutConfirm(true)}
        />

        <main className="flex-1">
          {customerTab === 'HOME' && (
            <CustomerHome
              onSelectService={handleOpenBookingWithService}
              onOpenBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
              onOpenLegal={(page) => setLegalModalPage(page)}
              onSelectTab={(tab) => handleCustomerTabChange(tab)}
              onRequestBookingWithAssistant={handleOpenBookingWithAssistant}
            />
          )}

          {(customerTab === 'REQUESTS' || customerTab === 'BOOKINGS') && (
            <CustomerBookings
              onSelectBooking={handleSelectBookingFromList}
              onOpenBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
            />
          )}

          {(customerTab === 'TRACK' || customerTab === 'ACTIVITY') && (
            <ActiveBookingView
              onOpenBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
              onSelectTab={(tab) => handleCustomerTabChange(tab)}
            />
          )}

          {customerTab === 'NOTIFICATIONS' && (
            <CustomerNotificationsView
              onNavigateToRequests={() => handleCustomerTabChange('REQUESTS')}
              onNavigateToTrack={() => handleCustomerTabChange('TRACK')}
              onNavigateToPayments={() => handleCustomerTabChange('PAYMENTS')}
            />
          )}

          {customerTab === 'PAYMENTS' && (
            <CustomerPaymentsView />
          )}

          {customerTab === 'PROFILE' && (
            <CustomerProfile
              onOpenBookingWithCoupon={(couponCode) => {
                setPreSelectedCouponCode(couponCode);
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
              onRequestBookingWithAssistant={handleOpenBookingWithAssistant}
              onViewAllFavorites={() => handleCustomerTabChange('FAVORITES')}
              onOpenLogout={() => setShowLogoutConfirm(true)}
            />
          )}

          {customerTab === 'SUPPORT' && <CustomerSupport />}

          {customerTab === 'FAVORITES' && (
            <CustomerFavoritesView
              onRequestBookingWithAssistant={handleOpenBookingWithAssistant}
              onOpenGeneralBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* Customer Mobile Navigation */}
      <CustomerBottomNav
        activeTab={customerTab}
        onSelectTab={(tab) => handleCustomerTabChange(tab)}
      />

      {/* Logout Confirmation Dialog: “Are you sure you want to logout?” */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />

      {/* Global Booking Flow Modal */}
      {isBookingModalOpen && (
        <BookingFlowModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setPreSelectedService(null);
            setPreSelectedAssistant(null);
            setPreSelectedCouponCode(null);
          }}
          preSelectedService={preSelectedService}
          preSelectedAssistant={preSelectedAssistant}
          initialCouponCode={preSelectedCouponCode || undefined}
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

      {/* Post-Booking Feedback & Tipping Modal (Appears when booking is marked Completed) */}
      {completedFeedbackBooking && (
        <PostBookingFeedbackModal
          isOpen={!!completedFeedbackBooking}
          onClose={() => dismissFeedbackModal(completedFeedbackBooking.id)}
          booking={completedFeedbackBooking}
        />
      )}
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
