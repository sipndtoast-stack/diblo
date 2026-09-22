import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Crosshair,
  Check,
  Loader2,
  AlertCircle,
  Building,
  Info,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { api } from '../../lib/api';

export interface LocationPickerResult {
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  address: string;
  area: string;
  landmark?: string;
  placeId?: string;
}

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialArea?: string;
  initialPlaceId?: string;
  onLocationSelected: (location: LocationPickerResult) => void;
  height?: string;
  showConfirmButton?: boolean;
  onConfirm?: () => void;
}

// Inner component for controlling Google Map instance
const GoogleMapController: React.FC<{
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (lat: number, lng: number) => void;
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
      style={{ width: '100%', height: '100%', minHeight: '260px' }}
    >
      <AdvancedMarker
        position={{ lat, lng }}
        draggable={true}
        onDragEnd={(e) => {
          if (e.latLng) {
            onMarkerDragEnd(e.latLng.lat(), e.latLng.lng());
          }
        }}
      >
        <div className="relative flex flex-col items-center cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl animate-bounce">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="w-2.5 h-2.5 bg-[#F42F73] rotate-45 -mt-1.5 shadow-md"></div>
          <div className="mt-1 bg-[#14213D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
            Service Location
          </div>
        </div>
      </AdvancedMarker>
    </Map>
  );
};

// Leaflet fallback controller when Google Maps is not configured or restricted
const LeafletLocationPickerController: React.FC<{
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDragEnd: (lat: number, lng: number) => void;
}> = ({ lat, lng, onMapClick, onMarkerDragEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-9 h-9 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="w-2 h-2 bg-[#F42F73] rotate-45 -mt-1 shadow-md"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 24]
      });

      const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(map);
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onMarkerDragEnd(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });

      markerRef.current = marker;
      mapRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat = 19.0596,
  initialLng = 72.8295,
  initialAddress = 'Bandra West, Mumbai, Maharashtra',
  initialArea = 'Bandra West',
  initialPlaceId,
  onLocationSelected,
  height = '320px',
  showConfirmButton = true,
  onConfirm
}) => {
  const { isConfigured, authError, authErrorDetails } = useGoogleMaps();
  const apiStatus = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');

  const [selectedLat, setSelectedLat] = useState<number>(initialLat);
  const [selectedLng, setSelectedLng] = useState<number>(initialLng);
  const [formattedAddress, setFormattedAddress] = useState<string>(initialAddress);
  const [selectedArea, setSelectedArea] = useState<string>(initialArea);
  const [placeId, setPlaceId] = useState<string | undefined>(initialPlaceId);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      formattedAddress: string;
      area: string;
      lat: number;
      lng: number;
      placeId?: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Geolocation state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  // Reverse Geocoding handler
  const handleLocationUpdate = useCallback(
    async (lat: number, lng: number) => {
      setSelectedLat(lat);
      setSelectedLng(lng);
      setIsReverseGeocoding(true);
      setLocationError(null);

      try {
        const res = await api.reverseGeocode(lat, lng);
        if (res && res.formattedAddress) {
          setFormattedAddress(res.formattedAddress);
          const area = res.area || 'Mumbai';
          setSelectedArea(area);
          setPlaceId(res.placeId);
          onLocationSelected({
            latitude: lat,
            longitude: lng,
            lat,
            lng,
            address: res.formattedAddress,
            area,
            placeId: res.placeId
          });
        }
      } catch {
        const fallbackAddr = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Mumbai`;
        setFormattedAddress(fallbackAddr);
        onLocationSelected({
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          address: fallbackAddr,
          area: selectedArea
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onLocationSelected, selectedArea]
  );

  // Current GPS Location handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
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
          setLocationError(
            'Location permission is required to automatically detect your location. You can also search for an address manually.'
          );
        } else {
          setLocationError('Could not retrieve GPS location. Please search for an address.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Autocomplete search using Places API (New) or server proxy fallback
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);

      // Attempt client-side Places API Autocomplete if loaded
      if (placesLib) {
        try {
          // Places API (New) autocomplete suggestions
          if ((placesLib as any).AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
            const resp = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: searchQuery.trim(),
              locationBias: {
                center: { lat: 19.0760, lng: 72.8777 },
                radius: 50000
              }
            });

            if (resp.suggestions && resp.suggestions.length > 0) {
              const parsed = await Promise.all(
                resp.suggestions.slice(0, 5).map(async (s: any) => {
                  const placePred = s.placePrediction;
                  const text = placePred?.text?.toString() || searchQuery;
                  const mainText = placePred?.mainText?.toString() || text;
                  const pid = placePred?.placeId;

                  // Geocode selected prediction or resolve location
                  try {
                    const place = placePred?.toPlace ? placePred.toPlace() : null;
                    if (place && place.fetchFields) {
                      await place.fetchFields({ fields: ['location', 'formattedAddress'] });
                      const loc = place.location;
                      if (loc) {
                        return {
                          formattedAddress: place.formattedAddress || text,
                          area: mainText,
                          lat: loc.lat(),
                          lng: loc.lng(),
                          placeId: pid
                        };
                      }
                    }
                  } catch {
                    // fallback
                  }

                  return {
                    formattedAddress: text,
                    area: mainText,
                    lat: 19.0596,
                    lng: 72.8295,
                    placeId: pid
                  };
                })
              );

              setSearchResults(parsed);
              setShowSearchResults(true);
              setIsSearching(false);
              return;
            }
          }
        } catch {
          // Fall through to server-side geocoding
        }
      }

      // Server-side Geocoding & Places Proxy
      try {
        const data = await api.geocodeAddress(searchQuery.trim());
        if (data && data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setShowSearchResults(true);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, placesLib]);

  const handleSelectSearchResult = (item: {
    formattedAddress: string;
    area: string;
    lat: number;
    lng: number;
    placeId?: string;
  }) => {
    setSelectedLat(item.lat);
    setSelectedLng(item.lng);
    setFormattedAddress(item.formattedAddress);
    setSelectedArea(item.area);
    setPlaceId(item.placeId);
    setShowSearchResults(false);
    setSearchQuery('');
    onLocationSelected({
      latitude: item.lat,
      longitude: item.lng,
      lat: item.lat,
      lng: item.lng,
      address: item.formattedAddress,
      area: item.area,
      placeId: item.placeId
    });
  };

  const handleConfirmLocationClick = () => {
    onLocationSelected({
      latitude: selectedLat,
      longitude: selectedLng,
      lat: selectedLat,
      lng: selectedLng,
      address: formattedAddress,
      area: selectedArea,
      placeId
    });
    if (onConfirm) onConfirm();
  };

  const isMapLoaded = isConfigured && apiStatus === APILoadingStatus.LOADED && !authError;

  return (
    <div className="w-full space-y-3">
      {/* Title / Section Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
          <span>Select Service Location</span>
        </label>
        {isReverseGeocoding && (
          <span className="text-[11px] text-[#F42F73] flex items-center gap-1 font-semibold">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Updating pin...</span>
          </span>
        )}
      </div>

      {/* 1. Search Location Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
            placeholder="Search address, landmark, society or building in Mumbai..."
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-[#14213D] focus:outline-none focus:border-[#F42F73] focus:bg-white min-h-[44px] transition-all shadow-xs"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Places Autocomplete Suggestions Dropdown */}
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

      {/* Geolocation Notice / Permission Error */}
      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">{locationError}</div>
        </div>
      )}

      {/* 2. Google Map Container */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100"
        style={{ height }}
      >
        {authError && (
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] px-3 py-1.5 bg-white/95 backdrop-blur-md border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate font-medium">Using OpenStreetMap for location selection</span>
            </div>
          </div>
        )}

        {isMapLoaded ? (
          <GoogleMapController
            lat={selectedLat}
            lng={selectedLng}
            onMapClick={handleLocationUpdate}
            onMarkerDragEnd={handleLocationUpdate}
          />
        ) : (
          <LeafletLocationPickerController
            lat={selectedLat}
            lng={selectedLng}
            onMapClick={handleLocationUpdate}
            onMarkerDragEnd={handleLocationUpdate}
          />
        )}

        {/* Tip: Click or drag pin to position */}
        <div className="absolute top-3 left-3 z-[401] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-100 flex items-center gap-1.5 text-[11px] font-medium text-[#14213D] pointer-events-none">
          <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
          <span>Drag pin or click map to adjust</span>
        </div>
      </div>

      {/* 3. [ Use my current location ] Button */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={isLocating}
        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-[#14213D] rounded-xl text-xs font-bold flex items-center justify-center gap-2 min-h-[44px] shadow-xs active:scale-[0.99] transition-all"
      >
        {isLocating ? (
          <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4 text-[#F42F73]" />
        )}
        <span>Use my current location</span>
      </button>

      {/* 4. Selected Location Box & Confirm Button */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <MapPin className="w-4 h-4 text-[#F42F73]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Selected Location
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#14213D] leading-snug">
              {formattedAddress}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Area: <span className="font-semibold text-[#14213D]">{selectedArea}</span> &bull; Coordinates: {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
              {placeId && <span className="text-[10px] text-gray-400 ml-1">(Place ID verified)</span>}
            </div>
          </div>
        </div>

        {showConfirmButton && (
          <button
            type="button"
            onClick={handleConfirmLocationClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#F42F73] hover:bg-[#D81B60] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 min-h-[44px] transition-all shrink-0 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Location</span>
          </button>
        )}
      </div>
    </div>
  );
};
