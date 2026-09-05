import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage, StaffSession, staffSessionStorage } from '../lib/api';
import { MOCK_CUSTOMERS, MOCK_ASSISTANTS } from '../data/mockData';

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
  isLoading: boolean;
  isFirebaseLive: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  updateAssistantProfile: (profile: Partial<AssistantProfile>) => void;
  loginStaff: (mobileNumber: string, password: string) => Promise<{ success: boolean; role?: 'Assistant' | 'Admin'; message?: string; eplId?: string; name?: string; number?: string; email?: string }>;
  logoutStaff: () => Promise<void>;
  logout?: () => Promise<void>;
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

  const logout = async () => {
    await logoutStaff();
  };

  const loginWithPhoneOtp = async () => ({ success: true });
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
        isAuthenticated: true,
        isLoading: false,
        isFirebaseLive: false,
        switchRole,
        updateCustomerProfile,
        updateAssistantProfile,
        loginStaff,
        logoutStaff,
        logout,
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
