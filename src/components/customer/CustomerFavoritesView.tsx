import React, { useState } from 'react';
import {
  Heart,
  Star,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  Phone,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_ASSISTANTS, SERVICES } from '../../data/mockData';
import { AssistantProfile, ServiceItem } from '../../types';

interface CustomerFavoritesViewProps {
  onRequestBookingWithAssistant: (assistant: AssistantProfile) => void;
  onOpenGeneralBooking: () => void;
}

export const CustomerFavoritesView: React.FC<CustomerFavoritesViewProps> = ({
  onRequestBookingWithAssistant,
  onOpenGeneralBooking
}) => {
  const { favoriteAssistantIds, toggleFavoriteAssistant, customerProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Derive favorite assistants and available assistants
  const savedAssistants = MOCK_ASSISTANTS.filter((asst) =>
    favoriteAssistantIds.includes(asst.id)
  );

  const availableAssistants = MOCK_ASSISTANTS.filter((asst) => {
    const isSaved = favoriteAssistantIds.includes(asst.id);
    if (isSaved) return false;
    const matchesSearch =
      asst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asst.serviceArea.some((area) => area.toLowerCase().includes(searchQuery.toLowerCase())) ||
      asst.languages.some((lang) => lang.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArea =
      selectedAreaFilter === 'ALL' ||
      asst.serviceArea.some((area) => area.toLowerCase().includes(selectedAreaFilter.toLowerCase()));
    return matchesSearch && matchesArea;
  });

  const handleToggle = async (assistant: AssistantProfile) => {
    const isNowFav = await toggleFavoriteAssistant(assistant.id);
    if (isNowFav) {
      showToast(`Added ${assistant.name} to your Saved Helpers list.`);
    } else {
      showToast(`Removed ${assistant.name} from your Saved Helpers.`);
    }
  };

  const getServiceName = (serviceId: string) => {
    const s = SERVICES.find((item) => item.id === serviceId);
    return s ? s.title : serviceId.replace(/-/g, ' ');
  };

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-4 sm:right-8 z-50 bg-[#14213D] text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-3">
          <Heart className="w-4 h-4 text-[#F42F73] fill-[#F42F73] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#14213D] via-[#1E293B] to-[#14213D] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#F42F73]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 bg-[#F42F73]/20 border border-[#F42F73]/30 px-3 py-1 rounded-full text-xs font-bold text-[#F42F73]">
            <Heart className="w-3.5 h-3.5 fill-[#F42F73]" />
            <span>Preferred Helpers List</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Saved & Preferred Assistants
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            Save your trusted Mumbai helpers to easily request them for future errands, senior citizen walks, hospital queues, and grocery tasks.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              {savedAssistants.length} Saved {savedAssistants.length === 1 ? 'Helper' : 'Helpers'}
            </span>
            <span className="text-xs font-semibold text-gray-300">
              Transparent ₹149/hr • 100% Police Verified
            </span>
          </div>
        </div>
      </div>

      {/* Saved Assistants Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#F42F73] fill-[#F42F73]" />
            <h2 className="text-lg sm:text-xl font-extrabold text-[#14213D]">
              Your Saved Helpers ({savedAssistants.length})
            </h2>
          </div>
          {savedAssistants.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
              Request preferred helpers directly for priority dispatch
            </span>
          )}
        </div>

        {savedAssistants.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-100 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-[#F42F73] flex items-center justify-center mx-auto shadow-inner">
              <Heart className="w-8 h-8 text-[#F42F73]" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[#14213D]">
                No Preferred Helpers Saved Yet
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Save assistants you love working with to quickly book them for recurring errands or upcoming tasks.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onOpenGeneralBooking}
                className="px-6 py-3 rounded-2xl bg-[#F42F73] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#D81B60] transition-colors cursor-pointer"
              >
                Book Instant Assistant @ ₹149/hr
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {savedAssistants.map((asst) => (
              <div
                key={asst.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-200/80 hover:border-[#F42F73] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Preferred Ribbon */}
                <div className="absolute top-0 right-0 bg-gradient-to-l from-[#F42F73] to-[#FF6B97] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  <span>Preferred</span>
                </div>

                <div>
                  {/* Top row: Avatar & Core Info */}
                  <div className="flex items-start gap-3.5 pr-20">
                    <div className="relative shrink-0">
                      <img
                        src={asst.photo}
                        alt={asst.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-sm"
                      />
                      {asst.isOnline && (
                        <span
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"
                          title="Currently Online"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-base text-[#14213D] leading-tight">
                          {asst.name}
                        </h3>
                        {asst.policeVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Police Verified</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1 text-amber-500 font-extrabold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{asst.rating}</span>
                        </span>
                        <span>•</span>
                        <span className="font-medium">{asst.completedTasksCount}+ tasks completed</span>
                      </div>

                      <div className="text-[11px] text-gray-400 font-medium mt-1 truncate">
                        Languages: {asst.languages.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Areas Badge */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-[#F42F73] shrink-0" />
                    <span className="font-medium text-[11px] truncate">
                      {asst.serviceArea.join(' • ')}
                    </span>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {asst.serviceCapabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] bg-gray-50 text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200/60 font-semibold"
                      >
                        {getServiceName(cap)}
                      </span>
                    ))}
                    {asst.serviceCapabilities.length > 3 && (
                      <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-lg font-medium">
                        +{asst.serviceCapabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onRequestBookingWithAssistant(asst)}
                    className="flex-1 py-2.5 px-4 bg-[#F42F73] hover:bg-[#D81B60] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98 min-h-[42px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Request for Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(asst)}
                    className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors min-h-[42px] min-w-[42px] flex items-center justify-center cursor-pointer"
                    title="Remove from Saved Helpers"
                    aria-label={`Remove ${asst.name} from saved helpers`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discover & Save More Mumbai Assistants */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-xs space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#14213D]">
            Discover More Verified Mumbai Assistants
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add trusted assistants across Bandra, Powai, Juhu, Dadar and South Mumbai to your preferred list
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by assistant name, languages, or Mumbai neighborhood..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[42px]"
            />
          </div>

          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#14213D] focus:outline-none focus:border-[#F42F73] min-h-[42px]"
          >
            <option value="ALL">All Mumbai Areas</option>
            <option value="Bandra">Bandra / Khar</option>
            <option value="Powai">Powai / Central</option>
            <option value="Andheri">Andheri / Juhu</option>
            <option value="Dadar">Dadar / Prabhadevi</option>
            <option value="Colaba">Colaba & South Mumbai</option>
          </select>
        </div>

        {/* Available Assistants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableAssistants.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-gray-400 font-medium">
              All assistants matching your query are already saved to your list!
            </div>
          ) : (
            availableAssistants.map((asst) => (
              <div
                key={asst.id}
                className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={asst.photo}
                    alt={asst.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs sm:text-sm text-[#14213D] truncate">
                        {asst.name}
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500 font-black text-xs">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{asst.rating}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      {asst.serviceArea.slice(0, 2).join(', ')} • {asst.completedTasksCount}+ tasks
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      ✓ Police Clearance Verified
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleToggle(asst)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white border border-rose-200 text-[#F42F73] text-xs font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Save to Helpers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestBookingWithAssistant(asst)}
                    className="py-2 px-3 rounded-xl bg-[#14213D] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors flex items-center justify-center gap-1 cursor-pointer min-h-[36px]"
                  >
                    <span>Request</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
