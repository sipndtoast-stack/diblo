import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Crosshair,
  ExternalLink,
  Clock,
  Car,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { api } from '../../lib/api';

interface AssistantTaskMapProps {
  customerLocation: {
    lat: number;
    lng: number;
    address: string;
    area?: string;
    landmark?: string;
  };
  serviceName: string;
  bookingNumber?: string;
  height?: string;
  externalRouteInfo?: {
    distanceText: string;
    durationText: string;
    isFallback?: boolean;
  } | null;
  assistantCoordinates?: { lat: number; lng: number } | null;
  focusTrigger?: number;
  onFocusMap?: () => void;
}

// Controller to pan and fit bounds between Assistant and Customer
const AssistantMapController: React.FC<{
  customerLocation: { lat: number; lng: number };
  assistantLocation: { lat: number; lng: number } | null;
  focusTrigger?: number;
}> = ({ customerLocation, assistantLocation, focusTrigger }) => {
  const map = useMap();

  const fitBothLocations = useCallback(() => {
    if (!map) return;

    if (assistantLocation) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(new google.maps.LatLng(customerLocation.lat, customerLocation.lng));
      bounds.extend(new google.maps.LatLng(assistantLocation.lat, assistantLocation.lng));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else {
      map.panTo(customerLocation);
      map.setZoom(15);
    }
  }, [map, customerLocation, assistantLocation]);

  // Initial load or coordinate update
  useEffect(() => {
    fitBothLocations();
  }, [fitBothLocations]);

  // Triggered whenever Focus Map is clicked
  useEffect(() => {
    if (focusTrigger) {
      fitBothLocations();
    }
  }, [focusTrigger, fitBothLocations]);

  return null;
};

// Leaflet interactive fallback when Google Maps API key is unconfigured or restricted
const LeafletAssistantTaskMapInner: React.FC<{
  customerLocation: { lat: number; lng: number; address: string };
  assistantLocation: { lat: number; lng: number } | null;
  focusTrigger?: number;
}> = ({ customerLocation, assistantLocation, focusTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Remove existing markers/polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const bounds: [number, number][] = [];

    // Customer marker
    const customerIcon = L.divIcon({
      className: 'custom-customer-pin',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-9 h-9 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="w-2 h-2 bg-[#F42F73] rotate-45 -mt-1 shadow-md"></div>
          <div class="mt-1 bg-[#14213D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
            Customer Location
          </div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 24]
    });
    L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon }).addTo(map);
    bounds.push([customerLocation.lat, customerLocation.lng]);

    // Assistant marker
    if (assistantLocation) {
      const assistantIcon = L.divIcon({
        className: 'custom-assistant-pin',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="relative flex items-center justify-center">
              <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <div class="w-2 h-2 bg-blue-600 rotate-45 -mt-1 shadow-md"></div>
            <div class="mt-1 bg-blue-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
              Your Location (Assistant)
            </div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 24]
      });
      L.marker([assistantLocation.lat, assistantLocation.lng], { icon: assistantIcon }).addTo(map);
      bounds.push([assistantLocation.lat, assistantLocation.lng]);

      // Route line
      L.polyline(
        [
          [assistantLocation.lat, assistantLocation.lng],
          [customerLocation.lat, customerLocation.lng]
        ],
        {
          color: '#F42F73',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8
        }
      ).addTo(map);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([customerLocation.lat, customerLocation.lng], 15);
    }
  }, [customerLocation, assistantLocation]);

  useEffect(() => {
    if (!mapRef.current || !focusTrigger) return;
    const bounds: [number, number][] = [[customerLocation.lat, customerLocation.lng]];
    if (assistantLocation) {
      bounds.push([assistantLocation.lat, assistantLocation.lng]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      mapRef.current.setView([customerLocation.lat, customerLocation.lng], 15);
    }
  }, [focusTrigger, customerLocation, assistantLocation]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export const AssistantTaskMap: React.FC<AssistantTaskMapProps> = ({
  customerLocation,
  serviceName,
  bookingNumber,
  height = '300px',
  externalRouteInfo,
  assistantCoordinates,
  focusTrigger,
  onFocusMap
}) => {
  const { isConfigured, authError, authErrorDetails } = useGoogleMaps();
  const apiStatus = useApiLoadingStatus();

  const [assistantLocation, setAssistantLocation] = useState<{ lat: number; lng: number } | null>(
    assistantCoordinates || null
  );
  const [internalFocusTrigger, setInternalFocusTrigger] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationPermissionError, setLocationPermissionError] = useState<string | null>(null);

  // Route calculation state
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceText: string;
    durationText: string;
    isFallback: boolean;
  } | null>(() => (externalRouteInfo ? { ...externalRouteInfo, isFallback: Boolean(externalRouteInfo.isFallback) } : null));

  // Sync external props if provided
  useEffect(() => {
    if (externalRouteInfo) {
      setRouteInfo({
        distanceText: externalRouteInfo.distanceText,
        durationText: externalRouteInfo.durationText,
        isFallback: Boolean(externalRouteInfo.isFallback)
      });
    }
  }, [externalRouteInfo]);

  useEffect(() => {
    if (assistantCoordinates) {
      setAssistantLocation(assistantCoordinates);
    }
  }, [assistantCoordinates]);

  // Calculate route from assistant to customer
  const calculateRoute = useCallback(async (originLat: number, originLng: number) => {
    setIsCalculatingRoute(true);
    try {
      const result = await api.getRoute(
        originLat,
        originLng,
        customerLocation.lat,
        customerLocation.lng,
        'DRIVE'
      );
      if (result && result.success) {
        setRouteInfo({
          distanceText: result.distanceText,
          durationText: result.durationText,
          isFallback: result.isFallback
        });
      }
    } catch {
      // route calculation handled gracefully
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [customerLocation.lat, customerLocation.lng]);

  // Handle Assistant granting location permission
  const handleDetectAssistantLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermissionError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationPermissionError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setAssistantLocation({ lat, lng });
        setIsLocating(false);
        calculateRoute(lat, lng);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermissionError(
            'Location permission denied. Please allow location access in your browser to view your route.'
          );
        } else {
          setLocationPermissionError('Unable to detect current GPS location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Construct official Google Maps Navigation Deep Link
  const getGoogleMapsNavigationUrl = () => {
    const dest = `${customerLocation.lat},${customerLocation.lng}`;
    if (assistantLocation) {
      const origin = `${assistantLocation.lat},${assistantLocation.lng}`;
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  };

  const isMapLoaded = isConfigured && apiStatus === APILoadingStatus.LOADED && !authError;

  const triggerFocusMap = useCallback(() => {
    setInternalFocusTrigger(Date.now());
    if (onFocusMap) {
      onFocusMap();
    }
  }, [onFocusMap]);

  return (
    <div className="w-full space-y-3 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header with Customer Location Details & Focus Map button */}
      <div className="p-3.5 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Customer Service Location</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-[#14213D] mt-0.5 line-clamp-1">
            {customerLocation.address}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            Area: <span className="font-semibold text-[#14213D]">{customerLocation.area || 'Mumbai'}</span> &bull; Coordinates: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Focus Map Button */}
          <button
            type="button"
            onClick={triggerFocusMap}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-[#14213D] border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[40px] shadow-2xs active:scale-95 transition-all shrink-0"
            title="Automatically adjust zoom and center view to fit both assistant and customer"
          >
            <Compass className="w-4 h-4 text-[#F42F73]" />
            <span>Focus Map</span>
          </button>

          <a
            href={getGoogleMapsNavigationUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#14213D] hover:bg-[#1E293B] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[40px] shadow-xs active:scale-95 transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#F42F73]" />
            <span>Open in Google Maps</span>
          </a>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ height }}>
        {authError && (
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] px-3 py-1.5 bg-white/95 backdrop-blur-md border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate font-medium">Using OpenStreetMap (Google Maps API key not configured or restricted)</span>
            </div>
            <a
              href={getGoogleMapsNavigationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F42F73] font-bold hover:underline shrink-0 text-[10px]"
            >
              Open External
            </a>
          </div>
        )}

        {isMapLoaded ? (
          <Map
            defaultCenter={{ lat: customerLocation.lat, lng: customerLocation.lng }}
            defaultZoom={15}
            mapId="DEMO_MAP_ID"
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            <AssistantMapController
              customerLocation={{ lat: customerLocation.lat, lng: customerLocation.lng }}
              assistantLocation={assistantLocation}
              focusTrigger={focusTrigger || internalFocusTrigger}
            />

            {/* Customer Location Marker */}
            <AdvancedMarker position={{ lat: customerLocation.lat, lng: customerLocation.lng }}>
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="w-2.5 h-2.5 bg-[#F42F73] rotate-45 -mt-1.5 shadow-md"></div>
                <div className="mt-1 bg-[#14213D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Customer Location
                </div>
              </div>
            </AdvancedMarker>

            {/* Assistant Current Location Marker (if permission granted) */}
            {assistantLocation && (
              <AdvancedMarker position={{ lat: assistantLocation.lat, lng: assistantLocation.lng }}>
                <div className="relative flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping" />
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xl">
                      <Navigation className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="w-2.5 h-2.5 bg-blue-600 rotate-45 -mt-1.5 shadow-md"></div>
                  <div className="mt-1 bg-blue-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                    Your Location (Assistant)
                  </div>
                </div>
              </AdvancedMarker>
            )}
          </Map>
        ) : (
          <LeafletAssistantTaskMapInner
            customerLocation={customerLocation}
            assistantLocation={assistantLocation}
            focusTrigger={focusTrigger || internalFocusTrigger}
          />
        )}
      </div>

      {/* Bottom Bar: GPS Location Trigger & Routes API Calculation Card */}
      <div className="p-3.5 bg-white space-y-2.5">
        {locationPermissionError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{locationPermissionError}</span>
          </div>
        )}

        {/* Routes API Summary Card */}
        {routeInfo && (
          <div className="p-3 bg-[#FFF0F5] border border-[#F42F73]/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F42F73] text-white flex items-center justify-center shadow-xs">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#F42F73] uppercase tracking-wider">
                  Routes API Calculation
                </div>
                <div className="text-xs font-extrabold text-[#14213D] mt-0.5">
                  Distance: <span className="text-[#F42F73]">{routeInfo.distanceText}</span> &bull; Est. Travel Time: <span className="text-[#F42F73]">{routeInfo.durationText}</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-400 font-semibold hidden sm:block">
              Live Google Routes
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDetectAssistantLocation}
              disabled={isLocating || isCalculatingRoute}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#14213D] rounded-xl text-xs font-bold flex items-center justify-center gap-2 min-h-[40px] transition-all active:scale-95"
            >
              {isLocating || isCalculatingRoute ? (
                <Loader2 className="w-4 h-4 text-[#F42F73] animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4 text-[#F42F73]" />
              )}
              <span>
                {assistantLocation
                  ? 'Refresh My Location & Recalculate Route'
                  : 'Detect My Location & Calculate Route'}
              </span>
            </button>

            <button
              type="button"
              onClick={triggerFocusMap}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-[#14213D] border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 min-h-[40px] transition-all active:scale-95"
              title="Fit map view to show both assistant and customer"
            >
              <Compass className="w-4 h-4 text-[#F42F73]" />
              <span>Focus Map View</span>
            </button>
          </div>

          <span className="text-[11px] text-gray-400">
            Assistant GPS is only used for route navigation
          </span>
        </div>
      </div>
    </div>
  );
};
