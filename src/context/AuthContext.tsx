import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage } from '../lib/api';
import {
  auth,
  onAuthStateChanged,
  firebaseSignOut,
  firebaseSignInWithEmail,
  firebaseSignUpWithEmail,
  isFirebaseConfigured,
  getFirebaseErrorMessage
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  customerProfile: CustomerProfile | null;
  assistantProfile: AssistantProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebaseLive: boolean;
  switchRole: (role: UserRole) => Promise<void>;
  loginWithPhoneOtp: (phone: string, otp: string, role?: UserRole, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailPassword: (
    email: string,
    pass: string,
    role?: UserRole,
    name?: string,
    isSignUp?: boolean
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  loginDemoUser: (role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  updateAssistantProfile: (profile: Partial<AssistantProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication starts as unauthenticated (null) and loading (true)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('CUSTOMER');
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [assistantProfile, setAssistantProfile] = useState<AssistantProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isFirebaseLive = isFirebaseConfigured();

  // Single Source of Truth: Firebase Auth listener + Persistent Session Check
  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirebase: (() => void) | null = null;

    async function verifyAndLoadSession() {
      setIsLoading(true);
      try {
        const savedToken = tokenStorage.get();
        const savedUser = tokenStorage.getUser();
        const activeRole = tokenStorage.getActiveRole();

        if (activeRole) {
          setCurrentRole(activeRole);
        }

        if (savedToken) {
          const meRes = await api.getMe().catch(() => null);

          if (isMounted) {
            if (meRes?.success && meRes.user) {
              setCurrentUser(meRes.user);
              const resolvedRole = meRes.user.role || activeRole || 'CUSTOMER';
              setCurrentRole(resolvedRole);

              if (resolvedRole === 'CUSTOMER') {
                if (meRes.profile) setCustomerProfile(meRes.profile);
                else {
                  const cust = await api.getCustomer(meRes.user.phone || 'cust-1').catch(() => null);
                  if (cust && isMounted) setCustomerProfile(cust);
                }
              } else if (resolvedRole === 'ASSISTANT') {
                if (meRes.profile) setAssistantProfile(meRes.profile);
                else {
                  const asst = await api.getAssistant(meRes.user.phone || 'asst-1').catch(() => null);
                  if (asst && isMounted) setAssistantProfile(asst);
                }
              }
            } else if (savedUser) {
              // Graceful fallback if backend session is valid locally
              setCurrentUser(savedUser);
              setCurrentRole(savedUser.role || activeRole || 'CUSTOMER');
            } else {
              // Invalid session
              tokenStorage.clear();
              setCurrentUser(null);
            }
          }
        } else {
          // No saved token -> unauthenticated
          if (isMounted) {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[Diblo Auth] Session verification notice:', err);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Subscribe to Firebase Auth listener when configured
    try {
      if (auth) {
        unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
          if (!isMounted) return;
          if (!firebaseUser && !tokenStorage.get()) {
            setCurrentUser(null);
            setIsLoading(false);
          }
        });
      }
    } catch (err) {
      console.warn('[Diblo Auth] Firebase listener init:', err);
    }

    verifyAndLoadSession();

    return () => {
      isMounted = false;
      if (unsubscribeFirebase) {
        unsubscribeFirebase();
      }
    };
  }, []);

  const switchRole = async (newRole: UserRole) => {
    setCurrentRole(newRole);
    tokenStorage.setActiveRole(newRole);

    try {
      if (newRole === 'CUSTOMER' && currentUser) {
        let cust = await api.getCustomer(currentUser.phone).catch(() => null);
        if (!cust) {
          cust = await api.createCustomerProfile({
            userId: currentUser.id,
            name: currentUser.name,
            phone: currentUser.phone,
            addresses: [
              {
                id: `addr-${Date.now()}`,
                title: 'Home',
                address: 'Mumbai, Maharashtra',
                area: 'Bandra West',
                lat: 19.0596,
                lng: 72.8295,
                isDefault: true
              }
            ],
            emergencyContact: {
              name: 'Emergency Contact',
              phone: '9820000000',
              relationship: 'Family'
            },
            referralCode: `DIBLO-${currentUser.phone.slice(-4)}`
          });
        }
        setCustomerProfile(cust);
      } else if (newRole === 'ASSISTANT' && currentUser) {
        let asst = await api.getAssistant(currentUser.phone).catch(() => null);
        if (!asst) {
          asst = await api.createAssistantProfile({
            userId: currentUser.id,
            name: currentUser.name,
            phone: currentUser.phone,
            hourlyRate: 199,
            serviceCategories: ['COMPANIONSHIP', 'LOCAL_MUMBAI_ERRANDS'],
            skills: ['Hindi & English Speaker', 'Mumbai Navigator', 'Senior Care']
          });
        }
        setAssistantProfile(asst);
      }
    } catch {
      // Role switch fallback
    }
  };

  const loginWithPhoneOtp = async (
    phone: string,
    otp: string,
    role: UserRole = 'CUSTOMER',
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.verifyOtp(phone, otp, role, name);
      if (res.success && res.user) {
        tokenStorage.setUser(res.user);
        setCurrentUser(res.user);
        setCurrentRole(role);

        if (role === 'CUSTOMER') {
          if (res.profile) setCustomerProfile(res.profile);
          else {
            const cust = await api.getCustomer(phone).catch(() => null);
            if (cust) setCustomerProfile(cust);
          }
        } else if (role === 'ASSISTANT') {
          if (res.profile) setAssistantProfile(res.profile);
          else {
            const asst = await api.getAssistant(phone).catch(() => null);
            if (asst) setAssistantProfile(asst);
          }
        }

        // Navigate to Home upon successful login
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        return { success: true };
      }
      return { success: false, error: res.error || 'Verification failed. Please check the OTP.' };
    } catch (e: any) {
      console.error('OTP login failed', e);
      return { success: false, error: e.message || 'Failed to complete OTP verification' };
    }
  };

  const loginWithEmailPassword = async (
    email: string,
    pass: string,
    role: UserRole = 'CUSTOMER',
    name?: string,
    isSignUp = false
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    // 1. Live Firebase Authentication flow when configured
    if (isFirebaseConfigured() && auth) {
      try {
        let userCred;
        if (isSignUp) {
          userCred = await firebaseSignUpWithEmail(email, pass, name);
        } else {
          userCred = await firebaseSignInWithEmail(email, pass);
        }

        const firebaseUser = userCred.user;
        const idToken = await firebaseUser.getIdToken();

        // Synchronize authenticated Firebase user with Diblo backend profile
        const syncRes = await api.syncFirebaseAuth({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || email,
          name: name || firebaseUser.displayName || undefined,
          role,
          firebaseToken: idToken
        });

        if (syncRes.success && syncRes.user) {
          tokenStorage.setUser(syncRes.user);
          setCurrentUser(syncRes.user);
          setCurrentRole(role);

          if (role === 'CUSTOMER' && syncRes.profile) {
            setCustomerProfile(syncRes.profile);
          } else if (role === 'ASSISTANT' && syncRes.profile) {
            setAssistantProfile(syncRes.profile);
          }
        }

        // Navigate to Home upon successful login
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        return { success: true };
      } catch (fbErr: any) {
        console.error('[Firebase Authentication Error]', fbErr);
        const { code, message } = getFirebaseErrorMessage(fbErr);
        return {
          success: false,
          code,
          error: `[${code}] ${message}`
        };
      }
    }

    // 2. Development / Local test flow when Firebase API key is not yet set in environment
    // Ensures end-to-end testing (New user -> Sign Up -> Home, Existing user -> Login -> Home) succeeds
    try {
      const res = await api.loginWithEmail(email, pass, role, name, isSignUp);
      if (res.success && res.user) {
        tokenStorage.setUser(res.user);
        setCurrentUser(res.user);
        setCurrentRole(role);

        if (role === 'CUSTOMER' && res.profile) {
          setCustomerProfile(res.profile);
        } else if (role === 'ASSISTANT' && res.profile) {
          setAssistantProfile(res.profile);
        }

        // Navigate to Home upon successful login
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        return { success: true };
      }
      return { success: false, error: res.error || 'Authentication failed. Please verify your credentials.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error communicating with authentication service' };
    }
  };

  const loginDemoUser = async (role: UserRole): Promise<{ success: boolean; error?: string }> => {
    let demoPhone = '9820123456';
    let demoName = 'Aarav Mehta';
    if (role === 'ASSISTANT') {
      demoPhone = '9820554433';
      demoName = 'Rajesh Sharma';
    } else if (role === 'ADMIN') {
      demoPhone = '9820001122';
      demoName = 'Kabir Varma';
    }
    return loginWithPhoneOtp(demoPhone, '1234', role, demoName);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    tokenStorage.clear();
    setCurrentUser(null);
    setCustomerProfile(null);
    setAssistantProfile(null);
    setCurrentRole('CUSTOMER');

    // Redirect immediately to Login screen
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        customerProfile,
        assistantProfile,
        isAuthenticated: !!currentUser,
        isLoading,
        isFirebaseLive,
        switchRole,
        loginWithPhoneOtp,
        loginWithEmailPassword,
        loginDemoUser,
        logout,
        updateCustomerProfile,
        updateAssistantProfile
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
