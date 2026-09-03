import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, CustomerProfile, AssistantProfile } from '../types';
import { api, tokenStorage } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: UserRole;
  customerProfile: CustomerProfile | null;
  assistantProfile: AssistantProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  switchRole: (role: UserRole) => void;
  loginWithPhoneOtp: (phone: string, otp: string, role: UserRole, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCustomerProfile: (profile: Partial<CustomerProfile>) => void;
  updateAssistantProfile: (profile: Partial<AssistantProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('CUSTOMER');
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'user-c-1',
    name: 'Aarav Mehta',
    phone: '9820123456',
    email: 'aarav.mehta@gmail.com',
    role: 'CUSTOMER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    createdAt: '2026-01-10T10:00:00Z'
  });
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [assistantProfile, setAssistantProfile] = useState<AssistantProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial profiles & seed token for preview if empty
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [custRes, asstRes] = await Promise.all([
          api.getCustomer('cust-1').catch(() => null),
          api.getAssistant('asst-1').catch(() => null)
        ]);
        if (custRes) setCustomerProfile(custRes);
        if (asstRes) setAssistantProfile(asstRes);

        // Auto authenticate demo session token if none exists
        if (!tokenStorage.get()) {
          const authRes = await api.verifyOtp('9820123456', '1234', 'CUSTOMER').catch(() => null);
          if (authRes?.token) {
            tokenStorage.set(authRes.token);
          }
        }
      } catch (err) {
        console.error('Failed to load initial profiles', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const switchRole = async (newRole: UserRole) => {
    tokenStorage.setActiveRole(newRole);
    setCurrentRole(newRole);
    let targetPhone = '9820123456';
    if (newRole === 'ASSISTANT') targetPhone = '9820554433';
    else if (newRole === 'ADMIN') targetPhone = '9820001122';
    else if (newRole === 'OPERATIONS') targetPhone = '9820003344';

    try {
      const authRes = await api.verifyOtp(targetPhone, '1234', newRole);
      if (authRes.success) {
        setCurrentUser(authRes.user);
        if (newRole === 'CUSTOMER' && authRes.profile) {
          setCustomerProfile(authRes.profile);
        } else if (newRole === 'ASSISTANT' && authRes.profile) {
          setAssistantProfile(authRes.profile);
        }
        return;
      }
    } catch {
      // Fallback local role update
    }

    if (newRole === 'CUSTOMER') {
      setCurrentUser({
        id: customerProfile?.userId || 'user-c-1',
        name: customerProfile?.name || 'Aarav Mehta',
        phone: customerProfile?.phone || '9820123456',
        email: customerProfile?.email || 'aarav.mehta@gmail.com',
        role: 'CUSTOMER',
        avatar: customerProfile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        createdAt: '2026-01-10T10:00:00Z'
      });
    } else if (newRole === 'ASSISTANT') {
      setCurrentUser({
        id: assistantProfile?.userId || 'user-a-1',
        name: assistantProfile?.name || 'Rajesh Sharma',
        phone: assistantProfile?.phone || '9820554433',
        email: assistantProfile?.email || 'rajesh.sharma@diblo.in',
        role: 'ASSISTANT',
        avatar: assistantProfile?.photo || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
        createdAt: '2025-10-15T10:00:00Z'
      });
    } else if (newRole === 'ADMIN') {
      setCurrentUser({
        id: 'user-admin-1',
        name: 'Kabir Varma',
        phone: '9820001122',
        email: 'admin@diblo.in',
        role: 'ADMIN',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
        createdAt: '2025-01-01T00:00:00Z'
      });
    } else if (newRole === 'OPERATIONS') {
      setCurrentUser({
        id: 'user-ops-1',
        name: 'Sneha Kulkarni',
        phone: '9820003344',
        email: 'ops.mumbai@diblo.in',
        role: 'OPERATIONS',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80',
        createdAt: '2025-06-01T00:00:00Z'
      });
    }
  };

  const loginWithPhoneOtp = async (phone: string, otp: string, role: UserRole, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.verifyOtp(phone, otp, role, name);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setCurrentRole(role);
        if (role === 'CUSTOMER' && res.profile) {
          setCustomerProfile(res.profile);
        } else if (role === 'ASSISTANT' && res.profile) {
          setAssistantProfile(res.profile);
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Verification failed' };
    } catch (e: any) {
      console.error('OTP login failed', e);
      return { success: false, error: e.message || 'Network error during login' };
    }
  };

  const logout = () => {
    tokenStorage.clear();
    setCurrentUser(null);
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
        switchRole,
        loginWithPhoneOtp,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
