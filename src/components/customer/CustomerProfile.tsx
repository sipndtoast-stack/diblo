import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, MapPin, ShieldCheck, Gift, CreditCard, Bell, Heart, Plus, Trash2, Check } from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const { currentUser, customerProfile, updateCustomerProfile } = useAuth();
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newTitle, setNewTitle] = useState('Office');
  const [newAddress, setNewAddress] = useState('Godrej One, Vikhroli East, Mumbai');
  const [newArea, setNewArea] = useState('Vikhroli');
  const [copySuccess, setCopySuccess] = useState(false);

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
        savedAddresses: [...customerProfile.savedAddresses, newAddr]
      });
    }
    setShowAddAddress(false);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('DIBLO-AARAV100');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 md:pb-12 text-[#14213D]">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
        <img
          src={
            customerProfile?.avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
          }
          alt="Avatar"
          className="w-20 h-20 rounded-full object-cover border-4 border-[#FFF0F5] shadow-xs shrink-0"
        />
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#14213D]">{customerProfile?.name || 'Aarav Mehta'}</h2>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mx-auto sm:mx-0 w-fit">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Customer</span>
            </span>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            +91 {customerProfile?.phone || '9820123456'} • {customerProfile?.email || 'aarav.mehta@gmail.com'}
          </div>
          <div className="text-xs text-gray-400">Member since January 2026 • Mumbai, MH</div>
        </div>

        <div className="bg-[#FFF0F5] p-4 rounded-2xl border border-[#F42F73]/20 text-center shrink-0 w-full sm:w-auto">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diblo Cash</div>
          <div className="text-2xl font-black text-[#F42F73]">₹350.00</div>
          <div className="text-[10px] text-[#14213D] font-medium">Auto-applies at checkout</div>
        </div>
      </div>

      {/* Refer & Earn Banner */}
      <div className="bg-gradient-to-r from-[#14213D] to-[#1E293B] text-white rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[#F42F73] text-xs font-extrabold uppercase">
            <Gift className="w-4 h-4 shrink-0" />
            <span>Refer Friends & Family in Mumbai</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">Earn ₹100 Diblo Cash for every verified referral</h3>
          <p className="text-xs text-gray-300">Your friend gets ₹100 off their first assistance booking too.</p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 sm:p-2 rounded-2xl border border-white/20 w-full sm:w-auto justify-between sm:justify-start">
          <span className="font-mono font-bold text-xs sm:text-sm px-2 text-white">DIBLO-AARAV100</span>
          <button
            onClick={handleCopyReferral}
            className="px-3.5 py-2 rounded-xl bg-[#F42F73] hover:bg-[#D81B60] text-white text-xs font-bold transition-all min-h-[40px] flex items-center justify-center"
          >
            {copySuccess ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
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
            className="px-3.5 py-2 rounded-xl bg-[#FFF0F5] text-[#F42F73] text-xs font-bold hover:bg-[#F42F73] hover:text-white transition-colors flex items-center justify-center gap-1 min-h-[40px] w-full sm:w-auto"
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
                  placeholder="Bandra / Juhu"
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
                onClick={handleAddAddress}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#F42F73] text-white text-xs font-bold rounded-xl min-h-[44px]"
              >
                Save Address
              </button>
              <button
                onClick={() => setShowAddAddress(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customerProfile?.savedAddresses.map((addr) => (
            <div
              key={addr.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-start gap-3 justify-between"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#F42F73] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#14213D]">{addr.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{addr.address}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{addr.area}, Mumbai</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-[#F42F73] shrink-0" />
          <h3 className="text-base font-bold">Emergency & Safety Contacts</h3>
        </div>
        <p className="text-xs text-gray-500">
          These contacts are automatically notified during active elder assistance or in case of an SOS alert.
        </p>

        <div className="bg-gray-50 p-3.5 sm:p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-[#14213D]">Pooja Mehta (Spouse)</div>
            <div className="text-xs text-gray-500">+91 9820987654</div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full w-fit">
            Active SOS Contact
          </span>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#14213D]">Account Information</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentUser?.name} • +91 {currentUser?.phone} • {currentUser?.email}
          </p>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
          Verified Diblo Member
        </span>
      </div>
    </div>
  );
};
