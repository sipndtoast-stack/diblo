import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider, useBooking } from './context/BookingContext';
import { GoogleMapsProvider } from './components/maps/GoogleMapsProvider';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { NotificationToast } from './components/common/NotificationToast';
import { CustomerHeader } from './components/customer/CustomerHeader';
import { CustomerBottomNav } from './components/customer/CustomerBottomNav';
import { CustomerHome } from './components/customer/CustomerHome';
import { CustomerBookings, CustomerRequestFilter } from './components/customer/CustomerBookings';
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
  const {
    staffUser,
    switchRole,
    isCustomerAuthenticated,
    isCustomerProfileComplete,
    customerProfileCompletion,
    isAuthLoading,
    logoutCustomer
  } = useAuth();
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
  const [profileIncompleteNotice, setProfileIncompleteNotice] = useState<string | null>(null);
  const [userOpenedProfileTab, setUserOpenedProfileTab] = useState<boolean>(false);

  // Customer Navigation Tab with URL preservation
  const [customerTab, setCustomerTab] = useState<CustomerTabType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      if (path.startsWith('/customer')) {
        const initialTab = getTabFromPath(path);
        return initialTab === 'PROFILE' ? 'HOME' : initialTab;
      }
    }
    return 'HOME';
  });

  // Customer My Requests Filter State (Upcoming | Active | Completed)
  const [requestsFilter, setRequestsFilter] = useState<CustomerRequestFilter>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const f = (params.get('filter') || '').toUpperCase();
      if (f === 'UPCOMING' || f === 'ACTIVE' || f === 'COMPLETED') {
        return f as CustomerRequestFilter;
      }
    }
    return 'UPCOMING';
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
    if (!isCustomerProfileComplete && tab !== 'PROFILE') {
      setCustomerTab('PROFILE');
      setProfileIncompleteNotice(
        `Please complete 100% of your Customer Profile (currently ${customerProfileCompletion}%) to unlock Home and all app options.`
      );
      if (typeof window !== 'undefined' && window.location.pathname !== '/customer/profile') {
        window.history.replaceState({}, '', '/customer/profile');
        setCurrentPath('/customer/profile');
      }
      return;
    }
    setProfileIncompleteNotice(null);
    setUserOpenedProfileTab(tab === 'PROFILE');
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

  // Handle selecting Upcoming / Active / Completed under My Requests
  const handleSelectRequestFilter = (filter: CustomerRequestFilter) => {
    if (!isCustomerProfileComplete) {
      setCustomerTab('PROFILE');
      setProfileIncompleteNotice(
        `Please complete 100% of your Customer Profile (currently ${customerProfileCompletion}%) to unlock My Requests.`
      );
      if (typeof window !== 'undefined' && window.location.pathname !== '/customer/profile') {
        window.history.pushState({}, '', '/customer/profile');
        setCurrentPath('/customer/profile');
      }
      return;
    }
    setProfileIncompleteNotice(null);
    setRequestsFilter(filter);
    setCustomerTab('REQUESTS');
    const path = `/customer/requests?filter=${filter.toLowerCase()}`;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath('/customer/requests');
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
      return;
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
      return;
    }

    if (isAuthLoading) return;

    // 3. If already authenticated as Staff (Assistant/Admin) on this device, open their workspace directly
    if (staffUser && staffUser.authenticated && !isCustomerAuthenticated) {
      if (
        currentPath === '/' ||
        currentPath === '/staff-login' ||
        currentPath === '/assistance-login'
      ) {
        if (staffUser.role === 'Admin') {
          switchRole('ADMIN');
          navigateTo('/admin');
        } else {
          switchRole('ASSISTANT');
          navigateTo('/assistant');
        }
        return;
      }
    }

    // 4. CENTRAL CUSTOMER AUTHENTICATION & PROFILE GUARD
    const isStaffOnlyRoute =
      currentPath === '/assistance-login' ||
      currentPath === '/staff-login' ||
      currentPath === '/apply-assistant';

    if (!isStaffOnlyRoute) {
      if (!isCustomerAuthenticated) {
        // NOT AUTHENTICATED -> Redirect any protected customer route to Login
        if (currentPath.startsWith('/customer')) {
          window.history.replaceState({}, '', '/customer-login');
          setCurrentPath('/customer-login');
        }
      } else {
        switchRole('CUSTOMER');
        if (!isCustomerProfileComplete) {
          // AUTHENTICATED + PROFILE INCOMPLETE (< 100%) -> Always redirect to Profile Completion
          setCustomerTab('PROFILE');
          if (currentPath !== '/customer/profile') {
            window.history.replaceState({}, '', '/customer/profile');
            setCurrentPath('/customer/profile');
          }
        } else {
          // AUTHENTICATED + PROFILE 100% COMPLETE -> Open Main Customer App
          setProfileIncompleteNotice(null);
          if (
            currentPath === '/' ||
            currentPath === '/customer-login' ||
            (currentPath === '/customer/profile' && !userOpenedProfileTab)
          ) {
            setCustomerTab('HOME');
            window.history.replaceState({}, '', '/customer');
            setCurrentPath('/customer');
          } else if (currentPath.startsWith('/customer')) {
            setCustomerTab(getTabFromPath(currentPath));
          }
        }
      }
    }
  }, [
    currentPath,
    staffUser,
    isCustomerAuthenticated,
    isCustomerProfileComplete,
    isAuthLoading,
    userOpenedProfileTab
  ]);

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

  const handleCustomerLoginSuccess = () => {
    if (!isCustomerProfileComplete) {
      setCustomerTab('PROFILE');
      navigateTo('/customer/profile');
    } else {
      setCustomerTab('HOME');
      navigateTo('/customer');
    }
  };

  // INITIAL AUTH & PROFILE LOADING STATE (Prevents flashing Login before Firebase checks session)
  if (
    isAuthLoading &&
    currentPath !== '/assistant' &&
    currentPath !== '/admin' &&
    currentPath !== '/assistance-login' &&
    currentPath !== '/staff-login' &&
    currentPath !== '/apply-assistant'
  ) {
    return (
      <div className="min-h-screen bg-[#FAF9FB] flex flex-col items-center justify-center p-6 font-sans text-[#14213D]">
        <div className="flex flex-col items-center gap-3.5 bg-white px-8 py-7 rounded-3xl shadow-xl shadow-pink-950/[0.04] border border-gray-100">
          <div className="text-3xl font-black text-[#F42F73] tracking-tight select-none">
            Diblo
          </div>
          <Loader2 className="w-7 h-7 animate-spin text-[#F42F73]" />
          <p className="text-xs font-semibold text-gray-500">
            Checking your session...
          </p>
        </div>
      </div>
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
        onCustomerSuccess={handleCustomerLoginSuccess}
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

  // CENTRAL CUSTOMER AUTHENTICATION & PROFILE GUARD
  // 1. If NOT authenticated -> Always show Customer Login
  if (!isCustomerAuthenticated) {
    return (
      <UnifiedLogin
        initialMode="CUSTOMER"
        onCustomerSuccess={handleCustomerLoginSuccess}
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

  // 2. If authenticated & profile < 100% -> Force Profile Completion
  // 3. If authenticated & profile === 100% -> Open Main Customer App
  const activeCustomerTab: CustomerTabType = !isCustomerProfileComplete
    ? 'PROFILE'
    : customerTab === 'PROFILE' && !userOpenedProfileTab
    ? 'HOME'
    : customerTab;

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex font-sans text-[#14213D] antialiased selection:bg-[#F42F73] selection:text-white">
      {/* Main Content View (Header with Hamburger Drawer + Active Tab Content) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Customer Header */}
        <CustomerHeader
          onOpenBooking={() => {
            if (!isCustomerProfileComplete) {
              setCustomerTab('PROFILE');
              setProfileIncompleteNotice(
                `Please complete 100% of your Customer Profile (currently ${customerProfileCompletion}%) before booking an assistant.`
              );
              return;
            }
            setIsBookingModalOpen(true);
          }}
          onSelectTab={(tab) => handleCustomerTabChange(tab)}
          onSelectRequestFilter={handleSelectRequestFilter}
          requestsFilter={requestsFilter}
          activeTab={activeCustomerTab}
          onOpenLogout={() => setShowLogoutConfirm(true)}
        />

        {profileIncompleteNotice && !isCustomerProfileComplete && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
              <AlertCircle className="w-4 h-4 text-[#F42F73] shrink-0" />
              <span>{profileIncompleteNotice}</span>
              <button
                type="button"
                onClick={() => setProfileIncompleteNotice(null)}
                className="ml-auto p-1 text-amber-700 hover:text-amber-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1">
          {activeCustomerTab === 'HOME' && (
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

          {(activeCustomerTab === 'REQUESTS' || activeCustomerTab === 'BOOKINGS') && (
            <CustomerBookings
              activeFilter={requestsFilter}
              onFilterChange={(nextFilter) => setRequestsFilter(nextFilter)}
              onSelectBooking={handleSelectBookingFromList}
              onOpenBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
            />
          )}

          {(activeCustomerTab === 'TRACK' || activeCustomerTab === 'ACTIVITY') && (
            <ActiveBookingView
              onOpenBooking={() => {
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
              onSelectTab={(tab) => handleCustomerTabChange(tab)}
            />
          )}

          {activeCustomerTab === 'NOTIFICATIONS' && (
            <CustomerNotificationsView
              onNavigateToRequests={() => handleCustomerTabChange('REQUESTS')}
              onNavigateToTrack={() => handleCustomerTabChange('TRACK')}
              onNavigateToPayments={() => handleCustomerTabChange('PAYMENTS')}
            />
          )}

          {activeCustomerTab === 'PAYMENTS' && (
            <CustomerPaymentsView />
          )}

          {activeCustomerTab === 'PROFILE' && (
            <CustomerProfile
              onOpenBookingWithCoupon={(couponCode) => {
                if (!isCustomerProfileComplete) {
                  setProfileIncompleteNotice(
                    `Please complete 100% of your Customer Profile (currently ${customerProfileCompletion}%) before booking.`
                  );
                  return;
                }
                setPreSelectedCouponCode(couponCode);
                setPreSelectedAssistant(null);
                setIsBookingModalOpen(true);
              }}
              onRequestBookingWithAssistant={handleOpenBookingWithAssistant}
              onViewAllFavorites={() => handleCustomerTabChange('FAVORITES')}
              onOpenLogout={() => setShowLogoutConfirm(true)}
              onContinueToHome={() => handleCustomerTabChange('HOME')}
            />
          )}

          {activeCustomerTab === 'SUPPORT' && <CustomerSupport />}

          {activeCustomerTab === 'FAVORITES' && (
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
        activeTab={activeCustomerTab}
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
