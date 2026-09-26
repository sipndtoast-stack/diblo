import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Heart,
  Plus,
  Trash2,
  Check,
  LogOut,
  Camera,
  Upload,
  Edit3,
  Save,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Globe,
  Activity,
  FileText,
  Calendar,
  Lock,
  Star,
  Bell,
  BellOff,
  Volume2,
  Send
} from 'lucide-react';
import { CustomerSpendingAnalytics } from './CustomerSpendingAnalytics';
import { ReferAFriendSection } from './ReferAFriendSection';
import { CustomerProfile as CustomerProfileType, AssistantProfile } from '../../types';
import { MOCK_ASSISTANTS } from '../../data/mockData';

interface CustomerProfileProps {
  onOpenBookingWithCoupon?: (couponCode: string) => void;
  onRequestBookingWithAssistant?: (assistant: AssistantProfile) => void;
  onViewAllFavorites?: () => void;
  onOpenLogout?: () => void;
}

const PRESET_AVATARS = [
  {
    id: 'av-1',
    label: 'Professional',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-2',
    label: 'Gentleman',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-3',
    label: 'Corporate',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-4',
    label: 'Urban Modern',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-5',
    label: 'Friendly Senior',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'av-6',
    label: 'Executive',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80'
  }
];

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  onOpenBookingWithCoupon,
  onRequestBookingWithAssistant,
  onViewAllFavorites,
  onOpenLogout
}) => {
  const {
    currentUser,
    customerProfile,
    updateCustomerProfile,
    logoutCustomer,
    favoriteAssistantIds,
    toggleFavoriteAssistant
  } = useAuth();
  const {
    fcmToken,
    pushPermission,
    notificationPreferences,
    updateNotificationPreferences,
    sendTestBookingPush,
    triggerOneHourReminderTest
  } = useBooking();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode Toggle
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [isEditingEmergencyContact, setIsEditingEmergencyContact] = useState(false);
  const [showAvatarPresets, setShowAvatarPresets] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Personal Info Form State
  const [formData, setFormData] = useState({
    name: customerProfile?.name || (currentUser?.name && currentUser.name !== 'Customer' ? currentUser.name : ''),
    phone: customerProfile?.phone || currentUser?.phone || '',
    email: customerProfile?.email || currentUser?.email || '',
    alternatePhone: customerProfile?.alternatePhone || '',
    gender: customerProfile?.gender || '',
    dob: customerProfile?.dob || '',
    preferredLanguage: customerProfile?.preferredLanguage || 'English',
    bloodGroup: customerProfile?.bloodGroup || '',
    specialInstructions: customerProfile?.specialInstructions || ''
  });

  // Emergency Contact Form State
  const [emergencyData, setEmergencyData] = useState({
    name: customerProfile?.emergencyContact?.name || '',
    relationship: customerProfile?.emergencyContact?.relationship || '',
    phone: customerProfile?.emergencyContact?.phone || ''
  });

  // Address State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newTitle, setNewTitle] = useState('Home');
  const [newAddress, setNewAddress] = useState('');
  const [newArea, setNewArea] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG or PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        updateCustomerProfile({ avatar: base64Url });
        showToast('Profile photo updated successfully!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Preset Avatar Selection
  const handleSelectPreset = (url: string) => {
    updateCustomerProfile({ avatar: url });
    setShowAvatarPresets(false);
    showToast('Profile avatar updated!');
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    updateCustomerProfile({ avatar: undefined });
    showToast('Profile photo removed.');
  };

  // Save Personal Info
  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Name is required');
      return;
    }

    updateCustomerProfile({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      alternatePhone: formData.alternatePhone.trim(),
      gender: formData.gender,
      dob: formData.dob,
      preferredLanguage: formData.preferredLanguage,
      bloodGroup: formData.bloodGroup,
      specialInstructions: formData.specialInstructions.trim()
    });

    setIsEditingPersonalInfo(false);
    showToast('Personal info saved successfully!');
  };

  // Save Emergency Contact
  const handleSaveEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyData.name.trim() || !emergencyData.phone.trim()) {
      showToast('Emergency contact name and phone are required');
      return;
    }

    updateCustomerProfile({
      emergencyContact: {
        name: emergencyData.name.trim(),
        relationship: emergencyData.relationship.trim(),
        phone: emergencyData.phone.trim()
      }
    });

    setIsEditingEmergencyContact(false);
    showToast('Emergency contact updated successfully!');
  };

  // Calculate Profile Completion %
  const calculateProfileCompletion = () => {
    let score = 0;
    if (customerProfile?.name || formData.name) score += 20;
    if (customerProfile?.phone || formData.phone) score += 15;
    if (customerProfile?.email || formData.email) score += 15;
    if (customerProfile?.avatar) score += 15;
    if (customerProfile?.savedAddresses?.length) score += 15;
    if (customerProfile?.emergencyContact?.name || emergencyData.name) score += 10;
    if (customerProfile?.specialInstructions || formData.specialInstructions) score += 10;
    return Math.min(score, 100);
  };

  const completionPercent = calculateProfileCompletion();

  const handleLogout = async () => {
    if (onOpenLogout) {
      onOpenLogout();
      return;
    }
    setIsLoggingOut(true);
    try {
      await logoutCustomer();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    const newAddr = {
      id: `addr-${Date.now()}`,
      title: newTitle,
      address: newAddress,
      area: newArea,
      lat: 19.0968,
      lng: 72.9284
    };
    if (customerProfile) {
      updateCustomerProfile({
        savedAddresses: [...(customerProfile.savedAddresses || []), newAddr]
      });
    }
    setShowAddAddress(false);
    showToast('Address added to your saved locations!');
  };

  const handleDeleteAddress = (id: string) => {
    if (customerProfile) {
      updateCustomerProfile({
        savedAddresses: customerProfile.savedAddresses.filter((a) => a.id !== id)
      });
      showToast('Address removed.');
    }
  };

  const currentAvatar = customerProfile?.avatar || currentUser?.avatar;
  const userInitials = (formData.name || 'CU')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 bg-[#14213D] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#F42F73]/30 flex items-center gap-2.5 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Profile Overview Card with Interactive Photo Upload */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar with Camera Overlay */}
        <div className="relative group shrink-0">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-[#FFF0F5] shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#F42F73] to-[#FF6B97] text-white font-black text-2xl flex items-center justify-center border-4 border-[#FFF0F5] shadow-md select-none">
              {userInitials}
            </div>
          )}

          {/* Camera Action Overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-105 cursor-pointer"
            title="Upload profile photo"
            aria-label="Upload profile photo"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Profile Header Details */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D]">{formData.name}</h2>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mx-auto sm:mx-0 w-fit">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified Customer</span>
            </span>
          </div>

          <div className="text-xs text-gray-500 font-medium flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span>+91 {formData.phone}</span>
            <span>•</span>
            <span>{formData.email}</span>
            {formData.gender && (
              <>
                <span>•</span>
                <span>{formData.gender}</span>
              </>
            )}
          </div>

          <div className="text-xs text-gray-400">
            Preferred Language: <span className="font-semibold text-gray-600">{formData.preferredLanguage}</span> • Mumbai, MH
          </div>

          {/* Photo Actions Button Bar */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF0F5] hover:bg-[#F42F73] text-[#F42F73] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAvatarPresets(!showAvatarPresets)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Choose Avatar</span>
            </button>

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Preset Avatars Selector Dropdown */}
          {showAvatarPresets && (
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 mt-2 space-y-2 animate-in fade-in duration-150">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Select a Mumbai Persona Avatar
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white transition-all cursor-pointer group"
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-11 h-11 rounded-full object-cover border-2 border-transparent group-hover:border-[#F42F73] shadow-xs"
                    />
                    <span className="text-[9px] font-semibold text-gray-600 truncate max-w-[60px]">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Diblo Cash Balance Card */}
        <div className="bg-[#FFF0F5] p-4 rounded-2xl border border-[#F42F73]/20 text-center shrink-0 w-full md:w-auto">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diblo Cash</div>
          <div className="text-2xl font-black text-[#F42F73]">₹{customerProfile?.walletBalance || 350}.00</div>
          <div className="text-[10px] text-[#14213D] font-medium">Auto-applies at checkout</div>
        </div>
      </div>

      {/* Profile Completion Meter */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#F42F73]" />
            <span className="text-xs font-bold">Profile Completion</span>
          </div>
          <span className="text-xs font-black text-[#F42F73]">{completionPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#F42F73] to-[#FF6B97] transition-all duration-500 rounded-full"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400">
          {completionPercent === 100
            ? '✓ Your profile is 100% complete for prioritized assistance matching.'
            : 'Complete your personal info, emergency contacts & photo for faster, verified bookings.'}
        </p>
      </div>

      {/* Personal Information Card (View & Edit Mode) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#F42F73]" />
            <h3 className="text-base font-bold">Personal Information</h3>
          </div>
          {!isEditingPersonalInfo ? (
            <button
              type="button"
              onClick={() => setIsEditingPersonalInfo(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Edit Details</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPersonalInfo(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {isEditingPersonalInfo ? (
          <form onSubmit={handleSavePersonalInfo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Primary Mobile */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number (+91)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="9820123456"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="aarav.mehta@gmail.com"
                  required
                />
              </div>

              {/* Alternate Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alternate Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                  placeholder="e.g. 9820987654"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                />
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Preferred Language in Mumbai</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="English">English</option>
                  <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                  <option value="Marathi (मराठी)">Marathi (मराठी)</option>
                  <option value="Gujarati (ગુજરાતી)">Gujarati (ગુજરાતી)</option>
                </select>
              </div>

              {/* Blood Group for Emergency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Blood Group (Safety Record)</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden min-h-[44px]"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            {/* Special Instructions / Notes for Assistants */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Special Assistance Instructions / Notes
              </label>
              <textarea
                rows={2}
                value={formData.specialInstructions}
                onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#F42F73] outline-hidden"
                placeholder="e.g. Elderly parents at home, wheelchair support needed, gate code instructions"
              />
            </div>

            {/* Save Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPersonalInfo(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Full Name</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.name}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Primary Phone</span>
              <div className="font-bold text-[#14213D] mt-0.5">+91 {formData.phone}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
              <div className="font-bold text-[#14213D] mt-0.5 truncate">{formData.email}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Gender</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.gender || 'Not specified'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Preferred Language</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.preferredLanguage}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Blood Group</span>
              <div className="font-bold text-[#14213D] mt-0.5">{formData.bloodGroup || 'O+'}</div>
            </div>
            {formData.specialInstructions && (
              <div className="p-3 bg-[#FFF0F5] border border-[#F42F73]/20 rounded-2xl sm:col-span-2 lg:col-span-3">
                <span className="text-[10px] font-bold text-[#F42F73] uppercase">
                  Special Notes for Helpers
                </span>
                <p className="font-semibold text-gray-700 mt-0.5 text-xs">
                  {formData.specialInstructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Emergency & Safety Contacts Section (Editable) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#F42F73] shrink-0" />
            <h3 className="text-base font-bold">Emergency & Safety Contacts</h3>
          </div>
          {!isEditingEmergencyContact ? (
            <button
              type="button"
              onClick={() => setIsEditingEmergencyContact(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Update Contact</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingEmergencyContact(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-gray-800 text-xs font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          This contact is automatically alerted during live elder assistance, medical queries, or when you trigger an emergency SOS alert.
        </p>

        {isEditingEmergencyContact ? (
          <form onSubmit={handleSaveEmergencyContact} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyData.name}
                  onChange={(e) => setEmergencyData({ ...emergencyData, name: e.target.value })}
                  placeholder="e.g. Pooja Mehta"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Relationship</label>
                <select
                  value={emergencyData.relationship}
                  onChange={(e) => setEmergencyData({ ...emergencyData, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mobile (+91)</label>
                <input
                  type="tel"
                  value={emergencyData.phone}
                  onChange={(e) => setEmergencyData({ ...emergencyData, phone: e.target.value })}
                  placeholder="9820987654"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs min-h-[42px]"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#F42F73] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Save Emergency Contact
              </button>
              <button
                type="button"
                onClick={() => setIsEditingEmergencyContact(false)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#14213D]">
                {emergencyData.name} ({emergencyData.relationship})
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">+91 {emergencyData.phone}</div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full w-fit flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Active SOS Emergency Contact</span>
            </span>
          </div>
        )}
      </div>

      {/* Push Notifications & Preferences (Firebase Cloud Messaging) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                notificationPreferences.pushEnabled
                  ? 'bg-[#FFF0F5] border-rose-100 text-[#F42F73]'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
            >
              {notificationPreferences.pushEnabled ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-[#14213D]">
                  Push Notifications & Preferences
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    notificationPreferences.pushEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {notificationPreferences.pushEnabled ? 'FCM Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Firebase Cloud Messaging (FCM) alerts for booking status updates and 1-hour session reminders
              </p>
            </div>
          </div>

          {/* Master Push Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-gray-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
            <span className="text-xs font-bold text-[#14213D]">
              {notificationPreferences.pushEnabled ? 'Push Enabled' : 'Push Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notificationPreferences.pushEnabled}
              aria-label="Toggle Push Notifications"
              onClick={async () => {
                const nextState = !notificationPreferences.pushEnabled;
                await updateNotificationPreferences({ pushEnabled: nextState });
                showToast(
                  nextState
                    ? 'Firebase Cloud Messaging push notifications enabled!'
                    : 'Push notifications muted.'
                );
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                notificationPreferences.pushEnabled ? 'bg-[#F42F73]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                  notificationPreferences.pushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Category Preference Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Booking Status Updates */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.bookingUpdates
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Booking Status Updates</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Assistant assigned, on the way, doorstep arrival & OTP start alerts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.bookingUpdates}
              onClick={async () => {
                const next = !notificationPreferences.bookingUpdates;
                await updateNotificationPreferences({ bookingUpdates: next });
                showToast(
                  next ? 'Booking update push alerts turned ON' : 'Booking update push alerts turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.bookingUpdates
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.bookingUpdates ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 1-Hour Session Reminders */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.sessionReminders
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Session & 1-Hour Reminders</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Automated push reminder 60 minutes before scheduled assistance starts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.sessionReminders}
              onClick={async () => {
                const next = !notificationPreferences.sessionReminders;
                await updateNotificationPreferences({ sessionReminders: next });
                showToast(
                  next ? '1-hour session reminders turned ON' : '1-hour session reminders turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.sessionReminders
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.sessionReminders ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Chime & Haptic Vibration */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.soundAndVibration
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Sound Chime & Vibration</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Play gentle dual-tone chime and vibrate on incoming push alerts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.soundAndVibration}
              onClick={async () => {
                const next = !notificationPreferences.soundAndVibration;
                await updateNotificationPreferences({ soundAndVibration: next });
                showToast(
                  next ? 'Notification sound & vibration enabled' : 'Notification sound muted'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.soundAndVibration
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.soundAndVibration ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Promotions & Diblo Cash Offers */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
              notificationPreferences.pushEnabled && notificationPreferences.promotionsAndOffers
                ? 'bg-[#FFF0F5]/40 border-rose-100'
                : 'bg-gray-50 border-gray-200 opacity-75'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                <span>Promotions & Diblo Cash</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Referral bonus unlocks, coupon codes & society partner discounts
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={!notificationPreferences.pushEnabled}
              aria-checked={notificationPreferences.promotionsAndOffers}
              onClick={async () => {
                const next = !notificationPreferences.promotionsAndOffers;
                await updateNotificationPreferences({ promotionsAndOffers: next });
                showToast(
                  next ? 'Promotional alerts turned ON' : 'Promotional alerts turned OFF'
                );
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                !notificationPreferences.pushEnabled
                  ? 'bg-gray-200 cursor-not-allowed'
                  : notificationPreferences.promotionsAndOffers
                  ? 'bg-[#F42F73] cursor-pointer'
                  : 'bg-gray-300 cursor-pointer'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                  notificationPreferences.promotionsAndOffers ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* FCM Status & Test Push Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#14213D]">FCM Channel:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600">
              {fcmToken ? `${fcmToken.slice(0, 22)}...` : 'Not registered'}
            </span>
            <span className="text-gray-400">•</span>
            <span>
              Browser Permission:{' '}
              <strong className="text-gray-700 capitalize">{pushPermission}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const res = await sendTestBookingPush();
                if (res.success) {
                  showToast('Sent test FCM booking update push notification!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF0F5] hover:bg-[#F42F73] text-[#F42F73] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test Booking Push</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const res = await triggerOneHourReminderTest();
                if (res.success) {
                  showToast('Sent test 1-hour session reminder push notification!');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#14213D] rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200"
            >
              <Bell className="w-3.5 h-3.5 text-[#F42F73]" />
              <span>Test 1-Hr Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Refer & Earn Interactive Feature: Unique Links, Tracker, and Earned Discount Coupons */}
      <ReferAFriendSection onOpenBookingWithCoupon={onOpenBookingWithCoupon} />

      {/* 6-Month Booking History & Spending Pattern Summary Chart */}
      <CustomerSpendingAnalytics />

      {/* Saved Helpers & Preferred Assistants Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#F42F73] fill-[#F42F73]" />
              <h3 className="text-base font-bold text-[#14213D]">
                Saved Helpers & Preferred Assistants ({favoriteAssistantIds.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Your preferred police-verified assistants for fast, prioritized task booking
            </p>
          </div>

          {onViewAllFavorites && (
            <button
              type="button"
              onClick={onViewAllFavorites}
              className="text-xs font-bold text-[#F42F73] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Manage all helpers</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {favoriteAssistantIds.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Heart className="w-6 h-6 text-gray-400 mx-auto" />
            <div className="text-xs font-bold text-gray-700">No favorite assistants saved yet</div>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Save your trusted helpers after tasks to easily request them for future errands.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {MOCK_ASSISTANTS.filter((a) => favoriteAssistantIds.includes(a.id)).map((asst) => (
              <div
                key={asst.id}
                className="p-3.5 rounded-2xl border border-rose-100 bg-gradient-to-r from-[#FFF0F5]/50 to-white flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={asst.photo}
                      alt={asst.name}
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-400"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#14213D] truncate flex items-center gap-1">
                      <span>{asst.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">✓</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                      <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {asst.rating}
                      </span>
                      <span>•</span>
                      <span className="truncate">{asst.serviceArea[0]}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRequestBookingWithAssistant && onRequestBookingWithAssistant(asst)}
                    className="py-1.5 px-3 bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteAssistant(asst.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">Saved Addresses in Mumbai</h3>
            <p className="text-xs text-gray-500">Quickly select addresses during booking</p>
          </div>
          <button
            onClick={() => setShowAddAddress(!showAddAddress)}
            className="px-3.5 py-2 rounded-xl bg-[#FFF0F5] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center justify-center gap-1 min-h-[40px] w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Address</span>
          </button>
        </div>

        {showAddAddress && (
          <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">Tag / Label</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Home / Parents / Office"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Area</label>
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Bandra / Juhu / Powai"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Complete Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Building name, street, Mumbai"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddAddress}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#F42F73] text-white text-xs font-bold rounded-xl min-h-[44px] cursor-pointer"
              >
                Save Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddAddress(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customerProfile?.savedAddresses?.map((addr) => (
            <div
              key={addr.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start gap-3 justify-between group hover:border-[#F42F73]/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F42F73] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#14213D]">{addr.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{addr.address}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{addr.area}, Mumbai</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteAddress(addr.id)}
                className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Delete address"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account Information & Logout */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#14213D]">Account Information</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {formData.name} • +91 {formData.phone} • {formData.email}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
            Verified Diblo Member
          </span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            id="btn-customer-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
