import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage, StaffSession, staffSessionStorage } from '../lib/api';
import { MOCK_CUSTOMERS, MOCK_ASSISTANTS } from '../data/mockData';
import { auth, isFirebaseConfigured } from '../lib/firebase';

const DEFAULT_USERS: Record<UserRole, User> = {
  CUSTOMER: {
    id: 'user-c-1',
    name: 'Aarav Mehta',
    phone: '9820123456',
    email: 'aarav.mehta@gmail.com',
    role: 'CUSTOMER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-01-10T10:00:00Z'
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

const DEFAULT_CUSTOMER_PROFILE: CustomerProfile = MOCK_CUSTOMERS[0];
const DEFAULT_ASSISTANT_PROFILE: AssistantProfile = MOCK_ASSISTANTS[0];

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
  loginStaff: (mobileNumber: string, password: string) => Promise<{ success: boolean; role?: 'Assistant' | 'Admin'; message?: string; eplId?: string; name?: string; number?: string; email?: string }>;
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
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS[initialRole] || DEFAULT_USERS.CUSTOMER);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(DEFAULT_CUSTOMER_PROFILE);
  const [assistantProfile, setAssistantProfile] = useState<AssistantProfile | null>(DEFAULT_ASSISTANT_PROFILE);
  const [isLoading] = useState<boolean>(false);
  const [firebaseCustomer, setFirebaseCustomer] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(() => Boolean(auth.currentUser));
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Restore Firebase Authentication for Customer automatically on load
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      if (fbUser) {
        setFirebaseCustomer(fbUser);
        setIsCustomerAuthenticated(true);
        const rawPhone = fbUser.phoneNumber || '';
        const cleanPhone = rawPhone.replace('+91', '').replace(/\D/g, '').slice(-10);

        let cust: CustomerProfile | null = null;
        if (cleanPhone) {
          cust = await api.getCustomer(cleanPhone).catch(() => null);
          if (!cust) {
            cust = await api.createCustomerProfile({
              id: `cust-${cleanPhone}`,
              userId: fbUser.uid,
              name: fbUser.displayName || 'Customer',
              phone: cleanPhone,
              email: fbUser.email || `${cleanPhone}@diblo.in`,
              walletBalance: 100
            }).catch(() => null);
          }
        }

        if (isMounted) {
          if (cust) {
            setCustomerProfile(cust);
          }
          if (currentRole === 'CUSTOMER') {
            setCurrentUser({
              id: fbUser.uid,
              name: cust?.name || fbUser.displayName || 'Customer',
              phone: cleanPhone || '9820000000',
              email: cust?.email || fbUser.email || (cleanPhone ? `${cleanPhone}@diblo.in` : 'customer@diblo.in'),
              role: 'CUSTOMER',
              avatar: fbUser.photoURL || cust?.avatar || DEFAULT_USERS.CUSTOMER.avatar,
              createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
            });
          }
          setIsAuthLoading(false);
        }
      } else {
        setFirebaseCustomer(null);
        setIsCustomerAuthenticated(false);
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
                role: verified.role
              };
              setStaffUser(updatedSession);
              staffSessionStorage.setSession(updatedSession);
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
          const cust = await api.getCustomer(currentUser.phone || '9820123456').catch(() => null);
          if (cust && isMounted) {
            setCustomerProfile(cust);
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
        const cust = await api.getCustomer(userForRole.phone).catch(() => null);
        if (cust) setCustomerProfile(cust);
      } else if (newRole === 'ASSISTANT') {
        const asst = await api.getAssistant(userForRole.phone).catch(() => null);
        if (asst) setAssistantProfile(asst);
      }
    } catch {
      // Role switch fallback
    }
  };

  const updateCustomerProfile = (updated: Partial<CustomerProfile>) => {
    if (customerProfile) {
      setCustomerProfile({ ...customerProfile, ...updated });
    }
  };

  const updateAssistantProfile = (updated: Partial<AssistantProfile>) => {
    if (assistantProfile) {
      setAssistantProfile({ ...assistantProfile, ...updated });
    }
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
      } else {
        setCurrentRole('ASSISTANT');
        setCurrentUser({
          ...DEFAULT_USERS.ASSISTANT,
          name: session.name,
          phone: session.number || DEFAULT_USERS.ASSISTANT.phone
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
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: `cust-${cleanPhone}`,
          userId: fbUser.uid,
          name: fbUser.displayName || 'Customer',
          phone: cleanPhone,
          email: fbUser.email || `${cleanPhone}@diblo.in`,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (cust) {
      setCustomerProfile(cust);
    }
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: fbUser.uid,
      name: cust?.name || fbUser.displayName || 'Customer',
      phone: cleanPhone || '9820000000',
      email: cust?.email || fbUser.email || (cleanPhone ? `${cleanPhone}@diblo.in` : 'customer@diblo.in'),
      role: 'CUSTOMER',
      avatar: fbUser.photoURL || cust?.avatar || DEFAULT_USERS.CUSTOMER.avatar,
      createdAt: fbUser.metadata?.creationTime || new Date().toISOString()
    });
  };

  // Sync Customer by verified phone (handles direct backend OTP verification and preserves Firebase auth state)
  const syncCustomerByPhone = async (phone: string, name?: string) => {
    const cleanPhone = phone.replace('+91', '').replace(/\D/g, '').slice(-10);

    // Ensure Firebase has an active authenticated session (anonymous if not already signed in)
    // so that Firestore security rules (request.auth != null) continue to permit operations
    let currentFbUser = auth.currentUser;
    if (!currentFbUser && isFirebaseConfigured()) {
      try {
        const anonCred = await signInAnonymously(auth);
        currentFbUser = anonCred.user;
        setFirebaseCustomer(currentFbUser);
      } catch (err) {
        console.warn('[Diblo Auth] Anonymous Firebase sign-in notice:', err);
      }
    }

    setIsCustomerAuthenticated(true);
    let cust: CustomerProfile | null = null;
    if (cleanPhone) {
      cust = await api.getCustomer(cleanPhone).catch(() => null);
      if (!cust) {
        cust = await api.createCustomerProfile({
          id: `cust-${cleanPhone}`,
          userId: currentFbUser?.uid || `user-c-${cleanPhone}`,
          name: name || `Customer ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          email: `${cleanPhone}@diblo.in`,
          walletBalance: 100
        }).catch(() => null);
      }
    }

    if (cust) {
      setCustomerProfile(cust);
    }
    setCurrentRole('CUSTOMER');
    setCurrentUser({
      id: currentFbUser?.uid || `user-c-${cleanPhone}`,
      name: cust?.name || name || `Customer ${cleanPhone.slice(-4)}`,
      phone: cleanPhone || '9820000000',
      email: cust?.email || `${cleanPhone}@diblo.in`,
      role: 'CUSTOMER',
      avatar: DEFAULT_USERS.CUSTOMER.avatar,
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
