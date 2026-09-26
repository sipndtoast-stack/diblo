import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage, StaffSession, staffSessionStorage } from '../lib/api';
import { MOCK_ASSISTANTS } from '../data/mockData';
import { auth, isFirebaseConfigured, ensureFirebaseAuthSession } from '../lib/firebase';

const DEFAULT_USERS: Record<UserRole, User> = {
  CUSTOMER: {
    id: '',
    name: 'Customer',
    phone: '',
    email: '',
    role: 'CUSTOMER',
    avatar: '',
    createdAt: new Date().toISOString()
  },
  ASSISTANT: {
    id: 'user-a-1',
    name: 'Rajesh Sharma',
    phone: '9820554433',
    email: 'rajesh.sharma@diblo.in',
    role: 'ASSISTANT',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    createdAt: '2025-10-15T10:00:00Z'
  },
  ADMIN: {
    id: 'user-admin-1',
    name: 'Kabir Varma',
    phone: '9820001122',
    email: 'admin@diblo.in',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-01-01T00:00:00Z'
  },
  OPERATIONS: {
    id: 'user-ops-1',
    name: 'Sneha Kulkarni',
    phone: '9820003344',
    email: 'ops.mumbai@diblo.in',
    role: 'OPERATIONS',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80',
    createdAt: '2025-06-01T00:00:00Z'
  }
};

const DEFAULT_ASSISTANT_PROFILE: AssistantProfile = MOCK_ASSISTANTS[0];

function isStaleDemoCustomer(obj: any): boolean {
  if (!obj) return true;
  if (obj.id === 'cust-1' || obj.id === 'user-c-1' || obj.userId === 'user-c-1') return true;
  if (typeof obj.name === 'string' && obj.name.trim().toLowerCase() === 'aarav mehta') return true;
  if (obj.phone === '9820123456') return true;
  return false;
}

export interface AuthContextType {
  currentUser: User;
  currentRole: UserRole;
  customerProfile: CustomerProfile | null;
  assistantProfile: AssistantProfile | null;
  staffUser: StaffSession | null;
  isAuthenticated: boolean;
  isCustomerAuthenticated: boolean;
  isAuthLoading: boolean;
  firebaseCustomer: FirebaseUser | null;
  isLoading: boolean;
  isFirebaseLive: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  updateAssistantProfile: (profile: Partial<AssistantProfile>) => void;
  favoriteAssistantIds: string[];
  toggleFavoriteAssistant: (assistantId: string) => Promise<boolean>;
  isAssistantFavorited: (assistantId: string) => boolean;
  loginStaff: (mobileNumber: string, password: string) => Promise<{ success: boolean; role?: 'Assistant' | 'Admin'; message?: string; code?: string; eplId?: string; name?: string; number?: string; email?: string }>;
  logoutStaff: () => Promise<void>;
  logoutCustomer: () => Promise<void>;
  logout?: () => Promise<void>;
  syncFirebaseCustomer: (user: FirebaseUser) => Promise<void>;
  syncCustomerByPhone?: (phone: string, name?: string) => Promise<void>;
  loginWithPhoneOtp?: (phone: string, otp: string, role?: UserRole, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailPassword?: (
    email: string,
    pass: string,
    role?: UserRole,
    name?: string,
    isSignUp?: boolean
  ) => Promise<{ success: boolean }>;
  loginDemoUser?: (role: UserRole) => Promise<{ success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial staff session from secure storage (only minimal metadata: authenticated, eplId, name, role)
  const [staffUser, setStaffUser] = useState<StaffSession | null>(() => staffSessionStorage.getSession());
  const initialRole = tokenStorage.getActiveRole() || 'CUSTOMER';
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedCust = localStorage.getItem('diblo_customer_profile');
      if (savedCust) {
        const parsed = JSON.parse(savedCust);
        if (isStaleDemoCustomer(parsed)) {
          localStorage.removeItem('diblo_customer_profile');
        } else if (initialRole === 'CUSTOMER') {
          return {
            id: parsed.userId || parsed.id || '',
            name: parsed.name || 'Customer',
            phone: parsed.phone || '',
            email: parsed.email || '',
            role: 'CUSTOMER',
            avatar: parsed.avatar || '',
            createdAt: parsed.createdAt || new Date().toISOString()
          };
        }
      }
    } catch {}
    return DEFAULT_USERS[initialRole] || DEFAULT_USERS.CUSTOMER;
  });
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('diblo_customer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isStaleDemoCustomer(parsed)) {
          localStorage.removeItem('diblo_customer_profile');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  const [assistantProfile, setAssistantProfile] = useState<AssistantProfile | null>(DEFAULT_ASSISTANT_PROFILE);
  const [isLoading] = useState<boolean>(false);
  const [firebaseCustomer, setFirebaseCustomer] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('diblo_customer_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!isStaleDemoCustomer(parsed) && parsed.phone) return true;
      }
    } catch {}
    return Boolean(auth.currentUser && !auth.currentUser.email?.startsWith('diblo.assistant.') && !auth.currentUser.email?.startsWith('diblo.admin.'));
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Restore Firebase Authentication for Customer automatically on load
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      const isStaffAuthAccount =
        fbUser?.email?.startsWith('diblo.assistant.') ||
        fbUser?.email?.startsWith('diblo.admin.') ||
        fbUser?.email?.startsWith('diblo.operations.');

      if (fbUser && !isStaffAuthAccount) {
        setFirebaseCustomer(fbUser);
        setIsCustomerAuthenticated(true);
        const rawPhone = fbUser.phoneNumber || '';
        const emailMatch = fbUser.email?.match(/^diblo\.customer\.(\d{10})@/);
        const cleanPhone = (rawPhone.replace('+91', '').replace(/\D/g, '').slice(-10)) || (emailMatch ? emailMatch[1] : '') || customerProfile?.phone || '';

        let cust: CustomerProfile | null = null;
        if (cleanPhone) {
          cust = await api.getCustomer(cleanPhone).catch(() => null);
          if (cust && isStaleDemoCustomer(cust)) cust = null;
          if (!cust) {
            cust = await api.createCustomerProfile({
              id: `cust-${cleanPhone}`,
              userId: fbUser.uid,
              name: fbUser.displayName || customerProfile?.name || `Customer ${cleanPhone.slice(-4)}`,
              phone: cleanPhone,
              email: fbUser.email || `${cleanPhone}@diblo.in`,
              walletBalance: 100
            }).catch(() => null);
          }
        }

        if (isMounted) {
          if (cust && !isStaleDemoCustomer(cust)) {
            setCustomerProfile(cust);
            try {
              localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
            } catch {}
          }
          if (currentRole === 'CUSTOMER') {
            setCurrentUser({
              id: fbUser.uid,
              name: cust?.name || fbUser.displayName || customerProfile?.name || 'Customer',
              phone: cleanPhone || cust?.phone || customerProfile?.phone || '',
              email: cust?.email || fbUser.email || customerProfile?.email || '',
              role: 'CUSTOMER',
              avatar: fbUser.photoURL || cust?.avatar || '',
              createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
            });
          }
          setIsAuthLoading(false);
        }
      } else {
        if (!isStaffAuthAccount) {
          setFirebaseCustomer(null);
          if (!customerProfile || isStaleDemoCustomer(customerProfile)) {
            setIsCustomerAuthenticated(false);
          }
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentRole]);

  // Validate active staff session on mount
  useEffect(() => {
    let isMounted = true;
    async function verifySession() {
      const cached = staffSessionStorage.getSession();
      if (cached && cached.authenticated) {
        try {
          const verified = await api.getStaffSession();
          if (isMounted) {
            if (verified.success && verified.authenticated && verified.role && verified.eplId) {
              const updatedSession: StaffSession = {
                authenticated: true,
                eplId: verified.eplId,
                name: verified.name || cached.name,
                number: verified.number || cached.number,
                email: verified.email || cached.email,
                role: verified.role
              };
              setStaffUser(updatedSession);
              staffSessionStorage.setSession(updatedSession);
              await ensureFirebaseAuthSession({
                id: updatedSession.eplId,
                name: updatedSession.name,
                phone: updatedSession.number,
                role: updatedSession.role === 'Admin' ? 'ADMIN' : 'ASSISTANT',
                assistantId: updatedSession.eplId
              });
            } else {
              setStaffUser(null);
              staffSessionStorage.clear();
            }
          }
        } catch {
          // Keep cached session if network check fails
        }
      }
    }
    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profile data on role change
  useEffect(() => {
    let isMounted = true;
    async function loadActiveProfile() {
      try {
        if (currentRole === 'CUSTOMER') {
          if (currentUser.phone && currentUser.phone !== '9820123456') {
            const cust = await api.getCustomer(currentUser.phone).catch(() => null);
            if (cust && !isStaleDemoCustomer(cust) && isMounted) {
              setCustomerProfile(cust);
            }
          }
        } else if (currentRole === 'ASSISTANT') {
          const asst = await api.getAssistant(currentUser.phone || '9820554433').catch(() => null);
          if (asst && isMounted) {
            setAssistantProfile(asst);
          }
        }
      } catch (err) {
        console.warn('[Diblo Profile] Sync notice:', err);
      }
    }
    loadActiveProfile();
    return () => {
      isMounted = false;
    };
  }, [currentRole, currentUser.phone]);

  const switchRole = async (newRole: UserRole) => {
    setCurrentRole(newRole);
    tokenStorage.setActiveRole(newRole);
    const userForRole = DEFAULT_USERS[newRole] || DEFAULT_USERS.CUSTOMER;
    setCurrentUser(userForRole);

    try {
      if (newRole === 'CUSTOMER') {
        if (customerProfile && !isStaleDemoCustomer(customerProfile)) {
          setCurrentUser({
            id: customerProfile.userId || customerProfile.id,
            name: customerProfile.name,
            phone: customerProfile.phone,
            email: customerProfile.email,
            role: 'CUSTOMER',
            avatar: customerProfile.avatar || '',
            createdAt: customerProfile.createdAt
          });
          await ensureFirebaseAuthSession({
            id: customerProfile.phone || customerProfile.id,
            name: customerProfile.name,
            phone: customerProfile.phone,
            role: 'CUSTOMER',
            customerId: customerProfile.id
          });
        }
      } else if (newRole === 'ASSISTANT') {
        const asst = await api.getAssistant(userForRole.phone).catch(() => null);
        if (asst) setAssistantProfile(asst);
        await ensureFirebaseAuthSession({
          id: asst?.id || userForRole.id || 'asst-1',
          name: asst?.name || userForRole.name,
          phone: asst?.phone || userForRole.phone,
          role: 'ASSISTANT',
          assistantId: asst?.id || 'asst-1'
        });
      } else {
        await ensureFirebaseAuthSession({
          id: userForRole.id,
          name: userForRole.name,
          phone: userForRole.phone,
          role: newRole
        });
      }
    } catch {
      // Role switch fallback
    }
  };

  const updateCustomerProfile = (updated: Partial<CustomerProfile>) => {
    if (customerProfile) {
      const merged = { ...customerProfile, ...updated };
      setCustomerProfile(merged);
      setCurrentUser((prev) => ({
        ...prev,
        name: updated.name ?? prev.name,
        email: updated.email ?? prev.email,
        phone: updated.phone ?? prev.phone,
        avatar: updated.avatar ?? prev.avatar
      }));
      try {
        localStorage.setItem('diblo_customer_profile', JSON.stringify(merged));
      } catch (err) {
        console.warn('Failed to save customer profile to localStorage:', err);
      }
    }
  };

  const updateAssistantProfile = (updated: Partial<AssistantProfile>) => {
    if (assistantProfile) {
      setAssistantProfile({ ...assistantProfile, ...updated });
    }
  };

  // Customer's Favorite / Saved Assistants
  const favoriteAssistantIds: string[] = customerProfile?.favoriteAssistantIds || [];

  const isAssistantFavorited = (assistantId: string): boolean => {
    return favoriteAssistantIds.includes(assistantId);
  };

  const toggleFavoriteAssistant = async (assistantId: string): Promise<boolean> => {
    const isCurrentlyFav = favoriteAssistantIds.includes(assistantId);
    const updated = isCurrentlyFav
      ? favoriteAssistantIds.filter((id) => id !== assistantId)
      : [...favoriteAssistantIds, assistantId];

    if (customerProfile) {
      updateCustomerProfile({ favoriteAssistantIds: updated });
    }

    try {
      localStorage.setItem('diblo_customer_favorites', JSON.stringify(updated));
    } catch {}

    // Synchronize to backend if customer ID exists
    const custId = customerProfile?.id;
    if (custId) {
      try {
        api.toggleFavoriteAssistant(custId, assistantId, !isCurrentlyFav);
      } catch (e) {
        console.warn('Failed to sync favorite assistant with server', e);
      }
    }

    return !isCurrentlyFav;
  };

  // Staff Login using Mobile Number and Password verified against Google Sheet
  const loginStaff = async (mobileNumber: string, password: string) => {
    const res = await api.loginStaff(mobileNumber, password);
    if (res.success && res.role) {
      const session: StaffSession = {
        authenticated: true,
        eplId: res.eplId || 'EPL001',
        name: res.name || (res.role === 'Admin' ? 'Admin' : 'Assistant'),
        number: res.number || mobileNumber,
        email: res.email || '',
        role: res.role
      };
      setStaffUser(session);
      staffSessionStorage.setSession(session);

      // Align active user & role
      if (res.role === 'Admin') {
        setCurrentRole('ADMIN');
        setCurrentUser({
          ...DEFAULT_USERS.ADMIN,
          name: session.name,
          phone: session.number || DEFAULT_USERS.ADMIN.phone
        });
        await ensureFirebaseAuthSession({
          id: session.eplId,
          name: session.name,
          phone: session.number,
          role: 'ADMIN'
        });
      } else {
        setCurrentRole('ASSISTANT');
        setCurrentUser({
          ...DEFAULT_USERS.ASSISTANT,
          name: session.name,
          phone: session.number || DEFAULT_USERS.ASSISTANT.phone
        });
        await ensureFirebaseAuthSession({
          id: session.eplId || session.number || 'asst-1',
          name: session.name,
          phone: session.number,
          role: 'ASSISTANT',
          assistantId: session.eplId || 'asst-1'
        });
      }
    }
    return res;
  };

  // Staff Logout: clears session and redirects to / (Access Selection screen)
  const logoutStaff = async () => {
    await api.logoutStaff();
    setStaffUser(null);
    staffSessionStorage.clear();
    setCurrentRole('CUSTOMER');
    setCurrentUser(DEFAULT_USERS.CUSTOMER);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Customer Logout: clears Firebase session and customer state, redirects to /customer-login
  const logoutCustomer = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Diblo Auth] Firebase signOut notice:', err);
    }
    try {
      localStorage.removeItem('diblo_customer_profile');
      tokenStorage.clear();
    } catch {}
    setFirebaseCustomer(null);
    setIsCustomerAuthenticated(false);
    setCustomerProfile(null);
    setCurrentUser(DEFAULT_USERS.CUSTOMER);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/customer-login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Sync Firebase authenticated Customer with local profile
  const syncFirebaseCustomer = async (fbUser: FirebaseUser) => {
    setFirebaseCustomer(fbUser);
    setIsCustomerAuthenticated(true);
    const rawPhone = fbUser.phoneNumber || '';
    const cleanPhone = rawPhone.replace('+91', '').replace(/\D/g, '').slice(-10);

    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      cust = await api.getCustomer(cleanPhone).catch(() => null);
      if (cust && isStaleDemoCustomer(cust)) cust = null;
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: `cust-${cleanPhone}`,
          userId: fbUser.uid,
          name: fbUser.displayName || `Customer ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          email: fbUser.email || `${cleanPhone}@diblo.in`,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (cust && !isStaleDemoCustomer(cust)) {
      setCustomerProfile(cust);
      try {
        localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
      } catch {}
    }
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: fbUser.uid,
      name: cust?.name || fbUser.displayName || 'Customer',
      phone: cleanPhone || cust?.phone || '',
      email: cust?.email || fbUser.email || (cleanPhone ? `${cleanPhone}@diblo.in` : ''),
      role: 'CUSTOMER',
      avatar: fbUser.photoURL || cust?.avatar || '',
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
    });
  };

  // Sync Customer by verified phone (handles direct backend OTP verification and preserves Firebase auth state)
  const syncCustomerByPhone = async (phone: string, name?: string) => {
    const cleanPhone = phone.replace('+91', '').replace(/\D/g, '').slice(-10);
    const custId = `cust-${cleanPhone}`;
    const displayName = name || `Customer ${cleanPhone.slice(-4)}`;

    const fbUid = await ensureFirebaseAuthSession({
      id: cleanPhone,
      name: displayName,
      phone: cleanPhone,
      role: 'CUSTOMER',
      customerId: custId
    });

    if (auth.currentUser) {
      setFirebaseCustomer(auth.currentUser);
    }

    setIsCustomerAuthenticated(true);
    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      cust = await api.getCustomer(cleanPhone).catch(() => null);
      if (cust && isStaleDemoCustomer(cust)) cust = null;
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: custId,
          userId: fbUid || `user-c-${cleanPhone}`,
          name: displayName,
          phone: cleanPhone,
          email: `${cleanPhone}@diblo.in`,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (cust && !isStaleDemoCustomer(cust)) {
      setCustomerProfile(cust);
      try {
        localStorage.setItem('diblo_customer_profile', JSON.stringify(cust));
      } catch {}
    }
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: fbUid || `user-c-${cleanPhone}`,
      name: cust?.name || displayName,
      phone: cleanPhone,
      email: cust?.email || `${cleanPhone}@diblo.in`,
      role: 'CUSTOMER',
      avatar: cust?.avatar || '',
      createdAt: new Date().toISOString()
    });
  };

  const logout = async () => {
    if (currentRole === 'CUSTOMER') {
      await logoutCustomer();
    } else {
      await logoutStaff();
    }
  };

  const loginWithPhoneOtp = async (phone: string, otp: string, role: UserRole = 'CUSTOMER', name?: string) => {
    try {
      const res = await api.verifyOtp(phone, otp, role, name);
      if (res.success) {
        await syncCustomerByPhone(phone, name || res.user?.name);
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid or expired verification code' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Verification failed. Please try again.' };
    }
  };
  const loginWithEmailPassword = async () => ({ success: true });
  const loginDemoUser = async () => ({ success: true });

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        customerProfile,
        assistantProfile,
        staffUser,
        isAuthenticated: isCustomerAuthenticated || Boolean(staffUser?.authenticated),
        isCustomerAuthenticated,
        isAuthLoading,
        firebaseCustomer,
        isLoading: false,
        isFirebaseLive: isFirebaseConfigured(),
        switchRole,
        updateCustomerProfile,
        updateAssistantProfile,
        favoriteAssistantIds,
        toggleFavoriteAssistant,
        isAssistantFavorited,
        loginStaff,
        logoutStaff,
        logoutCustomer,
        logout,
        syncFirebaseCustomer,
        syncCustomerByPhone,
        loginWithPhoneOtp,
        loginWithEmailPassword,
        loginDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
