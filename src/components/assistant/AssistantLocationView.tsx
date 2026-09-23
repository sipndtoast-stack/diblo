import React from 'react';
import {
  MapPin,
  RefreshCw,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Loader2
} from 'lucide-react';
import { MapView } from '../common/MapView';

interface AssistantLocationViewProps {
  gpsCoords: { lat: number; lng: number } | null;
  onRefreshLocation: () => Promise<void> | void;
  isRefreshing?: boolean;
  permissionStatus: 'granted' | 'prompt' | 'denied';
  address?: string;
  area?: string;
}

export const AssistantLocationView: React.FC<AssistantLocationViewProps> = ({
  gpsCoords,
  onRefreshLocation,
  isRefreshing = false,
  permissionStatus,
  address = 'Carter Road, Bandra West',
  area = 'Mumbai West'
}) => {
  const isAvailable = Boolean(gpsCoords) && permissionStatus !== 'denied';
  const currentLat = gpsCoords?.lat ?? 19.0596;
  const currentLng = gpsCoords?.lng ?? 72.8295;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#14213D] flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#F42F73]" />
            <span>MY LOCATION</span>
          </h2>
          <p className="text-xs text-gray-500">Live GPS position used for automated dispatch</p>
        </div>

        <button
          type="button"
          onClick={onRefreshLocation}
          disabled={isRefreshing}
          className="px-3.5 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-[#14213D] font-bold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50 min-h-[40px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#F42F73] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Locating...' : 'Refresh GPS'}</span>
        </button>
      </div>

      {/* Location Status Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Location Status
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
              isAvailable
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isAvailable ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>GPS ACTIVE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>LOCATION UNAVAILABLE</span>
              </>
            )}
          </span>
        </div>

        {/* Current Address & Area */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0F5] text-[#F42F73] flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#14213D]">{address}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">Operating Area: {area}</div>
            <div className="text-[11px] text-gray-400 font-mono mt-1">
              Coordinates: {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
            </div>
          </div>
        </div>

        {/* If unavailable, show simple instruction */}
        {!isAvailable && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Location is unavailable</span>
            </div>
            <p className="leading-relaxed">
              Please turn on <strong>Location / GPS</strong> in your phone settings and tap "Allow" when your browser asks for location access.
            </p>
            <button
              onClick={onRefreshLocation}
              className="mt-1 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Map View */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#14213D]">LIVE MAP PREVIEW</span>
          <span className="text-gray-400 font-mono">Bandra • Mumbai</span>
        </div>

        <div className="w-full h-72 rounded-2xl overflow-hidden border border-gray-200">
          <MapView
            center={{ lat: currentLat, lng: currentLng }}
            zoom={15}
            markers={[
              {
                id: 'my-location',
                position: { lat: currentLat, lng: currentLng },
                title: 'My Assistant Location',
                type: 'ASSISTANT'
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
};
