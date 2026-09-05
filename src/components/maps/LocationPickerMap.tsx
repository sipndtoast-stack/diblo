import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import {
  Search,
  MapPin,
  Navigation,
  Crosshair,
  Compass,
  Check,
  Loader2,
  AlertCircle,
  Building,
  Info
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { api } from '../../lib/api';

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialArea?: string;
  onLocationSelected: (location: {
    lat: number;
    lng: number;
    address: string;
    area: string;
    landmark?: string;
  }) => void;
  height?: string;
  showConfirmButton?: boolean;
  onConfirm?: () => void;
}

// Inner component when Google Maps JS API is available
const GoogleMapInner: React.FC<{
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}> = ({ lat, lng, onMapClick, onMarkerDragEnd }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [lat, lng, map]);

  return (
    <Map
      defaultCenter={{ lat, lng }}
      defaultZoom={15}
      mapId="DEMO_MAP_ID"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl={true}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      onClick={(e) => {
        if (e.detail?.latLng) {
          onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
        }
      }}
      className="w-full h-full"
    >
      <AdvancedMarker
        position={{ lat, lng }}
        draggable={true}
        onDragEnd={(e) => {
          if (e.latLng) {
            const newLat = e.latLng.lat();
            const newLng = e.latLng.lng();
            if (onMarkerDragEnd) {
              onMarkerDragEnd(newLat, newLng);
            } else {
              onMapClick(newLat, newLng);
            }
          }
        }}
      >
        <div className="relative flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="w-2.5 h-2.5 bg-[#F42F73] rotate-45 -mt-1.5 shadow-md"></div>
          <div className="mt-1 bg-[#14213D] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
            Selected Location
          </div>
        </div>
      </AdvancedMarker>
    </Map>
  );
};

// Status-aware wrapper for Google Map inner component (only rendered when Google Maps is configured)
const GoogleMapInnerWithStatus: React.FC<{
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  fallback: React.ReactNode;
}> = ({ lat, lng, onMapClick, onMarkerDragEnd, fallback }) => {
  const apiStatus = useApiLoadingStatus();
  if (apiStatus !== APILoadingStatus.LOADED) {
    return <>{fallback}</>;
  }
  return (
    <GoogleMapInner
      lat={lat}
      lng={lng}
      onMapClick={onMapClick}
      onMarkerDragEnd={onMarkerDragEnd}
    />
  );
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat = 19.0596,
  initialLng = 72.8295,
  initialAddress = 'Bandra West, Mumbai, Maharashtra',
  initialArea = 'Bandra West',
  onLocationSelected,
  height = '340px',
  showConfirmButton = true,
  onConfirm
}) => {
  const { isConfigured, apiKey } = useGoogleMaps();

  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress);
  const [selectedArea, setSelectedArea] = useState<string>(initialArea);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ formattedAddress: string; area: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // GPS / Geolocation state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  // Perform reverse geocoding on lat/lng change
  const handleLocationUpdate = useCallback(async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setIsReverseGeocoding(true);
    setLocationError(null);

    try {
      const res = await api.reverseGeocode(lat, lng);
      if (res && res.formattedAddress) {
        setFormattedAddress(res.formattedAddress);
        setSelectedArea(res.area || 'Mumbai');
        onLocationSelected({
          lat,
          lng,
          address: res.formattedAddress,
          area: res.area || 'Mumbai'
        });
      }
    } catch {
      const fallbackAddr = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Mumbai`;
      setFormattedAddress(fallbackAddr);
      onLocationSelected({
        lat,
        lng,
        address: fallbackAddr,
        area: selectedArea
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [onLocationSelected, selectedArea]);

  // Handle GPS Current Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setIsLocating(false);
        handleLocationUpdate(lat, lng);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please allow location access or search above.');
        } else {
          setLocationError('Could not retrieve GPS location. Please search for your area.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search input debounced handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.geocodeAddress(searchQuery.trim());
        if (data && data.results) {
          setSearchResults(data.results);
          setShowSearchResults(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: { formattedAddress: string; area: string; lat: number; lng: number }) => {
    setSelectedLat(item.lat);
    setSelectedLng(item.lng);
    setFormattedAddress(item.formattedAddress);
    setSelectedArea(item.area);
    setShowSearchResults(false);
    setSearchQuery('');
    onLocationSelected({
      lat: item.lat,
      lng: item.lng,
      address: item.formattedAddress,
      area: item.area
    });
  };

  const fallbackView = (
    /* Graceful Interactive Fallback if API key is in setup or loading */
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center bg-linear-to-b from-slate-50 to-slate-100">
      {/* Visual Map Grid Graphic */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#14213D_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="relative z-10 max-w-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-gray-200 flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6 text-[#F42F73]" />
        </div>

        <div>
          <div className="text-xs font-bold text-[#14213D]">
            {formattedAddress}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            Coordinates: {selectedLat.toFixed(4)}° N, {selectedLng.toFixed(4)}° E ({selectedArea})
          </div>
        </div>

        {/* Quick Mumbai Locality Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {[
            { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
            { name: 'Andheri West', lat: 19.1197, lng: 72.8468 },
            { name: 'Powai', lat: 19.1176, lng: 72.9060 },
            { name: 'BKC', lat: 19.0657, lng: 72.8687 },
            { name: 'Dadar', lat: 19.0178, lng: 72.8478 }
          ].map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => handleLocationUpdate(loc.lat, loc.lng)}
              className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-[#14213D] shadow-xs active:scale-95 transition-all"
            >
              {loc.name}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <Info className="w-3 h-3" />
          <span>Click chips or search above to position pin</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-3">
      {/* Search Input Bar with Current Location Quick Button */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search society, building, street, or area in Mumbai..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] focus:bg-white min-h-[44px] transition-all shadow-xs"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-[#14213D] rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[44px] shadow-xs active:scale-95 transition-all shrink-0"
            title="Use current GPS location"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4 text-[#F42F73]" />
            )}
            <span className="hidden sm:inline">Use GPS</span>
          </button>
        </div>

        {/* Autocomplete / Search Suggestions Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSearchResult(res)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-start gap-2.5 transition-colors"
              >
                <Building className="w-4 h-4 text-[#F42F73] mt-0.5 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-[#14213D]">{res.area}</div>
                  <div className="text-[11px] text-gray-500 line-clamp-1">{res.formattedAddress}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Geolocation Error Notification */}
      {locationError && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Interactive Map Container */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100"
        style={{ height }}
      >
        {isConfigured ? (
          <GoogleMapInnerWithStatus
            lat={selectedLat}
            lng={selectedLng}
            onMapClick={handleLocationUpdate}
            onMarkerDragEnd={handleLocationUpdate}
            fallback={fallbackView}
          />
        ) : (
          fallbackView
        )}

        {/* Floating "Click on map to drop pin" Tip */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-100 flex items-center gap-2 text-[11px] font-medium text-[#14213D]">
          <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
          <span>Click anywhere on map to drop pin</span>
        </div>

        {/* Floating Reverse Geocode Status */}
        {isReverseGeocoding && (
          <div className="absolute bottom-3 left-3 z-10 bg-[#14213D]/90 text-white px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 text-[11px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F42F73]" />
            <span>Resolving address...</span>
          </div>
        )}
      </div>

      {/* Selected Location Address Card */}
      <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <MapPin className="w-4 h-4 text-[#F42F73]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Confirmed Pickup Point
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#14213D] leading-tight">
              {formattedAddress}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Area: <span className="font-semibold text-[#14213D]">{selectedArea}</span> &bull; Lat/Lng: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
            </div>
          </div>
        </div>

        {showConfirmButton && onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 min-h-[44px] transition-all shrink-0 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Confirm This Location</span>
          </button>
        )}
      </div>
    </div>
  );
};
