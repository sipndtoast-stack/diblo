import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Crosshair,
  Search,
  Loader2,
  CheckCircle2,
  Navigation,
  Sparkles,
  Flag,
  Route as RouteIcon,
  Clock,
  X
} from 'lucide-react';
import { useGoogleMapsConfig } from './GoogleMapsProvider';
import { api } from '../../lib/api';

export interface SelectedLocationData {
  address: string;
  area: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface RouteCalculationSummary {
  distanceText: string;
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  polyline?: string | null;
}

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialArea?: string;
  onLocationSelect: (location: SelectedLocationData) => void;
  destinationLocation?: SelectedLocationData | null;
  onDestinationSelect?: (destination: SelectedLocationData | null, routeSummary?: RouteCalculationSummary | null) => void;
  showDestinationInput?: boolean;
  height?: string;
}

function decodeGooglePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const poly: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

const MapController: React.FC<{
  pickupPos: { lat: number; lng: number };
  destPos?: { lat: number; lng: number } | null;
  encodedPolyline?: string | null;
  shouldPan: boolean;
  onPanComplete: () => void;
}> = ({ pickupPos, destPos, encodedPolyline, shouldPan, onPanComplete }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (map && shouldPan) {
      if (destPos) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickupPos);
        bounds.extend(destPos);
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      } else {
        map.panTo(pickupPos);
        if ((map.getZoom() || 14) < 15) {
          map.setZoom(15);
        }
      }
      onPanComplete();
    }
  }, [map, pickupPos, destPos, shouldPan, onPanComplete]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (destPos) {
      const path = encodedPolyline ? decodeGooglePolyline(encodedPolyline) : [pickupPos, destPos];
      const line = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#4F46E5',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map
      });
      polylineRef.current = line;
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, pickupPos, destPos, encodedPolyline]);

  return null;
};

interface PlaceSuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
  lat?: number;
  lng?: number;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat = 19.0607,
  initialLng = 72.8258,
  initialAddress = '',
  initialArea = 'Bandra West',
  onLocationSelect,
  destinationLocation = null,
  onDestinationSelect,
  showDestinationInput = false,
  height = '260px'
}) => {
  const { isConfigured, isLoading: isConfigLoading } = useGoogleMapsConfig();

  const [activePinMode, setActivePinMode] = useState<'PICKUP' | 'DESTINATION'>('PICKUP');
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>({
    lat: initialLat || 19.0607,
    lng: initialLng || 72.8258
  });
  const [destMarkerPos, setDestMarkerPos] = useState<{ lat: number; lng: number } | null>(
    destinationLocation ? { lat: destinationLocation.lat, lng: destinationLocation.lng } : null
  );
  const [shouldPan, setShouldPan] = useState<boolean>(false);

  // Pickup Search & Reverse Geocode State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlaceSuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Destination Search State
  const [destQuery, setDestQuery] = useState<string>(destinationLocation?.address || '');
  const [destResults, setDestResults] = useState<PlaceSuggestionItem[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>(initialAddress);
  const [resolvedArea, setResolvedArea] = useState<string>(initialArea);
  const [destResolvedAddress, setDestResolvedAddress] = useState<string>(destinationLocation?.address || '');
  const [destResolvedArea, setDestResolvedArea] = useState<string>(destinationLocation?.area || '');

  // Route State (Google Routes API)
  const [routeSummary, setRouteSummary] = useState<RouteCalculationSummary | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLat && initialLng && (Math.abs(initialLat - markerPos.lat) > 0.0001 || Math.abs(initialLng - markerPos.lng) > 0.0001)) {
      setMarkerPos({ lat: initialLat, lng: initialLng });
      setShouldPan(true);
    }
  }, [initialLat, initialLng]);

  // Calculate real route via Google Routes API whenever both pickup and destination are set
  const computeRouteBetweenPoints = useCallback(
    async (
      pickup: { lat: number; lng: number },
      dest: { lat: number; lng: number; address: string; area: string; placeId?: string } | null
    ) => {
      if (!dest) {
        setRouteSummary(null);
        onDestinationSelect?.(null, null);
        return;
      }
      setIsCalculatingRoute(true);
      try {
        const res = await api.getRoute(pickup.lat, pickup.lng, dest.lat, dest.lng, 'DRIVE');
        const summary: RouteCalculationSummary = {
          distanceText: res.distanceText,
          distanceKm: res.distanceKm,
          durationText: res.durationText,
          durationMinutes: res.durationMinutes,
          polyline: res.polyline
        };
        setRouteSummary(summary);
        onDestinationSelect?.(
          {
            address: dest.address,
            area: dest.area,
            lat: dest.lat,
            lng: dest.lng,
            placeId: dest.placeId
          },
          summary
        );
      } catch {
        setRouteSummary(null);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [onDestinationSelect]
  );

  // Reverse geocode coordinates using Google Geocoding API
  const fetchAddressForCoords = useCallback(
    async (lat: number, lng: number, target: 'PICKUP' | 'DESTINATION' = 'PICKUP') => {
      setIsReverseGeocoding(true);
      try {
        const data = await api.reverseGeocode(lat, lng);
        if (target === 'PICKUP') {
          setResolvedAddress(data.formattedAddress);
          setResolvedArea(data.area);
          onLocationSelect({
            address: data.formattedAddress,
            area: data.area,
            lat: data.lat,
            lng: data.lng,
            placeId: data.placeId
          });
          if (destMarkerPos && destResolvedAddress) {
            await computeRouteBetweenPoints(
              { lat: data.lat, lng: data.lng },
              {
                lat: destMarkerPos.lat,
                lng: destMarkerPos.lng,
                address: destResolvedAddress,
                area: destResolvedArea || 'Mumbai'
              }
            );
          }
        } else {
          setDestResolvedAddress(data.formattedAddress);
          setDestResolvedArea(data.area);
          setDestQuery(data.formattedAddress);
          await computeRouteBetweenPoints(markerPos, {
            lat: data.lat,
            lng: data.lng,
            address: data.formattedAddress,
            area: data.area,
            placeId: data.placeId
          });
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [onLocationSelect, destMarkerPos, destResolvedAddress, destResolvedArea, markerPos, computeRouteBetweenPoints]
  );

  // Initial reverse geocode if address is empty
  useEffect(() => {
    if (!initialAddress && initialLat && initialLng) {
      fetchAddressForCoords(initialLat, initialLng, 'PICKUP');
    }
  }, []);

  // Search Places using Google Places API (New) Autocomplete + Geocoding fallback
  const performPlacesSearch = async (
    queryText: string,
    setResults: React.Dispatch<React.SetStateAction<PlaceSuggestionItem[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (queryText.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const autoRes = await api.searchPlacesAutocomplete(queryText, markerPos.lat, markerPos.lng);
      if (autoRes.suggestions && autoRes.suggestions.length > 0) {
        setResults(autoRes.suggestions);
        setLoading(false);
        return;
      }

      // Fallback to Geocoding API
      const geoData = await api.geocodeAddress(queryText);
      const mapped: PlaceSuggestionItem[] = (geoData.results || []).map((r, i) => ({
        placeId: r.placeId || `geo-${i}`,
        mainText: r.area || r.formattedAddress.split(',')[0],
        secondaryText: r.formattedAddress,
        description: r.formattedAddress,
        lat: r.lat,
        lng: r.lng
      }));
      setResults(mapped);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      performPlacesSearch(value, setSearchResults, setIsSearching);
    }, 300);
  };

  const handleDestSearchChange = (value: string) => {
    setDestQuery(value);
    if (destTimeoutRef.current) clearTimeout(destTimeoutRef.current);
    if (!value.trim()) {
      setDestResults([]);
      setDestMarkerPos(null);
      setDestResolvedAddress('');
      setDestResolvedArea('');
      setRouteSummary(null);
      onDestinationSelect?.(null, null);
      return;
    }
    destTimeoutRef.current = setTimeout(() => {
      performPlacesSearch(value, setDestResults, setIsSearchingDest);
    }, 300);
  };

  const resolvePlaceSuggestion = async (item: PlaceSuggestionItem): Promise<SelectedLocationData | null> => {
    if (item.lat !== undefined && item.lng !== undefined) {
      return {
        address: item.description,
        area: item.mainText || 'Mumbai',
        lat: item.lat,
        lng: item.lng,
        placeId: item.placeId
      };
    }
    if (item.placeId && !item.placeId.startsWith('geo-')) {
      const details = await api.getPlaceDetails(item.placeId);
      if (details.success && details.lat !== undefined && details.lng !== undefined) {
        return {
          address: details.formattedAddress || item.description,
          area: details.area || item.mainText || 'Mumbai',
          lat: details.lat,
          lng: details.lng,
          placeId: details.placeId
        };
      }
    }
    const geo = await api.geocodeAddress(item.description);
    if (geo.results && geo.results.length > 0) {
      const first = geo.results[0];
      return {
        address: first.formattedAddress,
        area: first.area,
        lat: first.lat,
        lng: first.lng,
        placeId: first.placeId
      };
    }
    return null;
  };

  const handleSelectPickupSuggestion = async (item: PlaceSuggestionItem) => {
    setSearchResults([]);
    setIsSearching(true);
    const resolved = await resolvePlaceSuggestion(item);
    setIsSearching(false);
    if (!resolved) return;

    setMarkerPos({ lat: resolved.lat, lng: resolved.lng });
    setShouldPan(true);
    setResolvedAddress(resolved.address);
    setResolvedArea(resolved.area);
    setSearchQuery('');
    onLocationSelect(resolved);

    if (destMarkerPos && destResolvedAddress) {
      await computeRouteBetweenPoints(
        { lat: resolved.lat, lng: resolved.lng },
        {
          lat: destMarkerPos.lat,
          lng: destMarkerPos.lng,
          address: destResolvedAddress,
          area: destResolvedArea || 'Mumbai'
        }
      );
    }
  };

  const handleSelectDestSuggestion = async (item: PlaceSuggestionItem) => {
    setDestResults([]);
    setIsSearchingDest(true);
    const resolved = await resolvePlaceSuggestion(item);
    setIsSearchingDest(false);
    if (!resolved) return;

    setDestMarkerPos({ lat: resolved.lat, lng: resolved.lng });
    setDestResolvedAddress(resolved.address);
    setDestResolvedArea(resolved.area);
    setDestQuery(resolved.address);
    setShouldPan(true);

    await computeRouteBetweenPoints(markerPos, resolved);
  };

  const handleClearDestination = () => {
    setDestQuery('');
    setDestResults([]);
    setDestMarkerPos(null);
    setDestResolvedAddress('');
    setDestResolvedArea('');
    setRouteSummary(null);
    setActivePinMode('PICKUP');
    onDestinationSelect?.(null, null);
  };

  const handleUseCurrentGps = () => {
    if (!('geolocation' in navigator)) return;
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setMarkerPos({ lat, lng });
        setShouldPan(true);
        await fetchAddressForCoords(lat, lng, 'PICKUP');
        setIsLocatingGps(false);
      },
      () => {
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = (e: any) => {
    const latLng = e?.detail?.latLng;
    if (latLng && typeof latLng.lat === 'number' && typeof latLng.lng === 'number') {
      const lat = Number(latLng.lat.toFixed(6));
      const lng = Number(latLng.lng.toFixed(6));
      if (activePinMode === 'DESTINATION' && showDestinationInput) {
        setDestMarkerPos({ lat, lng });
        fetchAddressForCoords(lat, lng, 'DESTINATION');
      } else {
        setMarkerPos({ lat, lng });
        fetchAddressForCoords(lat, lng, 'PICKUP');
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Pickup & Destination Search Header (Google Places API New) */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 relative">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setActivePinMode('PICKUP')}
              placeholder="Search pickup / current location on Google Places..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={isLocatingGps}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition shrink-0 border border-indigo-200/60"
          >
            {isLocatingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            <span>Use Live GPS</span>
          </button>
        </div>

        {/* Pickup Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto z-30 relative">
            {searchResults.map((res, idx) => (
              <button
                key={`${res.placeId}-${idx}`}
                type="button"
                onClick={() => handleSelectPickupSuggestion(res)}
                className="w-full text-left px-3 py-2.5 hover:bg-indigo-50/60 transition flex items-start gap-2.5"
              >
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{res.mainText}</p>
                  <p className="text-[11px] text-slate-500 truncate">{res.secondaryText || res.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Destination Search Input (Google Places API New) */}
        {showDestinationInput && (
          <div className="relative">
            <Flag className="w-4 h-4 text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={destQuery}
              onChange={(e) => handleDestSearchChange(e.target.value)}
              onFocus={() => setActivePinMode('DESTINATION')}
              placeholder="Search destination location (optional - e.g. Hospital, Market, Bank)..."
              className="w-full pl-9 pr-16 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearchingDest && <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
              {destQuery && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  title="Clear destination"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {destResults.length > 0 && (
              <div className="mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto z-30 relative">
                {destResults.map((res, idx) => (
                  <button
                    key={`dest-${res.placeId}-${idx}`}
                    type="button"
                    onClick={() => handleSelectDestSuggestion(res)}
                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50/60 transition flex items-start gap-2.5"
                  >
                    <Flag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{res.mainText}</p>
                      <p className="text-[11px] text-slate-500 truncate">{res.secondaryText || res.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showDestinationInput && (
          <div className="flex items-center justify-between pt-0.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Map tap sets:</span>
              <button
                type="button"
                onClick={() => setActivePinMode('PICKUP')}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  activePinMode === 'PICKUP'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pickup Pin
              </button>
              <button
                type="button"
                onClick={() => setActivePinMode('DESTINATION')}
                className={`px-2 py-0.5 rounded-md font-bold transition ${
                  activePinMode === 'DESTINATION'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Destination Pin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real Interactive Google Map Canvas */}
      <div className="relative w-full bg-slate-100" style={{ height }}>
        {isConfigLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : isConfigured ? (
          <Map
            defaultCenter={markerPos}
            defaultZoom={15}
            mapId="DIBLO_LOCATION_PICKER_MAP"
            gestureHandling="greedy"
            disableDefaultUI={false}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            onClick={handleMapClick}
            className="w-full h-full"
          >
            <MapController
              pickupPos={markerPos}
              destPos={destMarkerPos}
              encodedPolyline={routeSummary?.polyline}
              shouldPan={shouldPan}
              onPanComplete={() => setShouldPan(false)}
            />

            {/* Pickup Location Marker */}
            <AdvancedMarker
              position={markerPos}
              draggable={true}
              onDragEnd={(e) => {
                const latLng = e.latLng;
                if (latLng) {
                  const lat = Number(latLng.lat().toFixed(6));
                  const lng = Number(latLng.lng().toFixed(6));
                  setMarkerPos({ lat, lng });
                  fetchAddressForCoords(lat, lng, 'PICKUP');
                }
              }}
            >
              <div className="flex flex-col items-center">
                <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                  Pickup Location
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </AdvancedMarker>

            {/* Destination Location Marker */}
            {destMarkerPos && (
              <AdvancedMarker
                position={destMarkerPos}
                draggable={true}
                onDragEnd={(e) => {
                  const latLng = e.latLng;
                  if (latLng) {
                    const lat = Number(latLng.lat().toFixed(6));
                    const lng = Number(latLng.lng().toFixed(6));
                    setDestMarkerPos({ lat, lng });
                    fetchAddressForCoords(lat, lng, 'DESTINATION');
                  }
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                    Destination
                  </div>
                  <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                    <Flag className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-500 p-4 text-center">
            Loading Google Maps...
          </div>
        )}

        {/* Live Google Maps Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-1.5 pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[11px] font-bold text-slate-700">Google Maps Live</span>
        </div>

        {/* Route Distance & Travel Time Overlay when Destination is set */}
        {(routeSummary || isCalculatingRoute) && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold">
                {isCalculatingRoute ? 'Calculating Google Route...' : `Route Distance: ${routeSummary?.distanceText}`}
              </span>
            </div>
            {routeSummary && !isCalculatingRoute && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Est. Travel: {routeSummary.durationText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Pickup & Destination Summary Footer */}
      <div className="p-3 bg-white flex flex-col gap-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              {isReverseGeocoding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Pickup: {resolvedArea || 'Mumbai'}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({markerPos.lat.toFixed(4)}, {markerPos.lng.toFixed(4)})
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate">
                {resolvedAddress || 'Tap on the Google Map or search above to pin pickup location'}
              </p>
            </div>
          </div>
          <div className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            <span>Pin Locked</span>
          </div>
        </div>

        {destMarkerPos && destResolvedAddress && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Flag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Destination: {destResolvedArea || 'Mumbai'}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({destMarkerPos.lat.toFixed(4)}, {destMarkerPos.lng.toFixed(4)})
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate">{destResolvedAddress}</p>
              </div>
            </div>
            {routeSummary && (
              <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                {routeSummary.distanceText} • {routeSummary.durationText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
