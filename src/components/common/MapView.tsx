import React, { useEffect, useRef, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { Navigation, Compass, MapPin, Star, User } from 'lucide-react';
import { useGoogleMaps } from '../maps/GoogleMapsProvider';

interface MapViewProps {
  assistantLocation?: { lat: number; lng: number; address?: string };
  customerLocation?: { lat: number; lng: number; address?: string };
  allAssistants?: {
    id: string;
    name: string;
    photo?: string;
    rating?: number;
    lat: number;
    lng: number;
    isOnline: boolean;
    activeBookingId?: string | null;
    serviceArea?: string[];
  }[];
  height?: string;
  showRoute?: boolean;
  etaMinutes?: number;
  distanceKm?: number;
  onAssistantClick?: (assistantId: string) => void;
  interactive?: boolean;
}

// ============================================================
// GOOGLE MAPS IMPLEMENTATION
// ============================================================
const GoogleMapViewInner: React.FC<MapViewProps> = ({
  assistantLocation,
  customerLocation,
  allAssistants = [],
  showRoute = true,
  onAssistantClick,
  interactive = true
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);

  // Auto-fit bounds on markers change
  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    let count = 0;

    if (customerLocation) {
      bounds.extend({ lat: customerLocation.lat, lng: customerLocation.lng });
      count++;
    }

    if (assistantLocation) {
      bounds.extend({ lat: assistantLocation.lat, lng: assistantLocation.lng });
      count++;
    }

    if (allAssistants.length > 0) {
      allAssistants.forEach((a) => {
        bounds.extend({ lat: a.lat, lng: a.lng });
        count++;
      });
    }

    if (count > 1) {
      map.fitBounds(bounds, 60);
    } else if (count === 1) {
      const center = customerLocation || assistantLocation || { lat: allAssistants[0].lat, lng: allAssistants[0].lng };
      map.setCenter(center);
      map.setZoom(15);
    }
  }, [map, customerLocation, assistantLocation, allAssistants]);

  const defaultCenter = customerLocation || assistantLocation || { lat: 19.0596, lng: 72.8295 };

  return (
    <Map
      defaultCenter={{ lat: defaultCenter.lat, lng: defaultCenter.lng }}
      defaultZoom={14}
      mapId="DEMO_MAP_ID"
      gestureHandling={interactive ? 'greedy' : 'none'}
      disableDefaultUI={!interactive}
      zoomControl={interactive}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      className="w-full h-full"
    >
      {/* 1. Customer Pickup Location Marker */}
      {customerLocation && (
        <AdvancedMarker position={{ lat: customerLocation.lat, lng: customerLocation.lng }}>
          <div className="relative flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#14213D] text-white flex items-center justify-center border-2 border-white shadow-xl">
              <MapPin className="w-4 h-4 text-[#F42F73]" />
            </div>
            <div className="w-2 h-2 bg-[#14213D] rotate-45 -mt-1 shadow"></div>
            <div className="mt-1 bg-white border border-gray-200 text-[#14213D] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">
              Your Location
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* 2. Single Active Assistant Marker with Radar Pulse */}
      {assistantLocation && (
        <AdvancedMarker position={{ lat: assistantLocation.lat, lng: assistantLocation.lng }}>
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 rounded-full bg-[#F42F73]/30 animate-ping" />
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-2xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-7 bg-[#14213D] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow whitespace-nowrap">
              Diblo Assistant
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* 3. Multiple Assistants Radar Pins */}
      {allAssistants.map((asst) => {
        const isBusy = !!asst.activeBookingId;
        const color = isBusy ? '#F59E0B' : asst.isOnline ? '#10B981' : '#94A3B8';
        const isSelected = selectedAssistant === asst.id;

        return (
          <AdvancedMarker
            key={asst.id}
            position={{ lat: asst.lat, lng: asst.lng }}
            onClick={() => {
              setSelectedAssistant(asst.id);
              if (onAssistantClick) onAssistantClick(asst.id);
            }}
          >
            <div className="relative flex flex-col items-center cursor-pointer group">
              <div
                className="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110"
                style={{ backgroundColor: color }}
              >
                {asst.photo ? (
                  <img src={asst.photo} alt={asst.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">{asst.name.charAt(0)}</span>
                )}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[9px] text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                ★
              </div>

              {isSelected && (
                <div className="absolute bottom-full mb-2 bg-[#14213D] text-white p-2.5 rounded-xl shadow-xl min-w-[150px] z-50 text-left">
                  <div className="font-bold text-xs">{asst.name}</div>
                  <div className="text-[10px] text-gray-300">{asst.serviceArea?.slice(0, 2).join(', ') || 'Mumbai'}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span style={{ color }}>{isBusy ? 'On Task' : asst.isOnline ? 'Online' : 'Offline'}</span>
                    <span className="text-amber-400 font-bold">★ {asst.rating || 4.9}</span>
                  </div>
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </Map>
  );
};

// ============================================================
// LEAFLET FALLBACK ENGINE (WHEN API KEY NOT YET SET)
// ============================================================
const LeafletMapViewInner: React.FC<MapViewProps> = ({
  assistantLocation,
  customerLocation,
  allAssistants = [],
  showRoute = true,
  onAssistantClick,
  interactive = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = customerLocation?.lat || assistantLocation?.lat || 19.0596;
    const initialLng = customerLocation?.lng || assistantLocation?.lng || 72.8295;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        dragging: interactive,
        scrollWheelZoom: interactive,
        touchZoom: interactive
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      if (interactive) {
        L.control.zoom({ position: 'topright' }).addTo(map);
      }

      markersRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const bounds: [number, number][] = [];

    if (allAssistants.length > 0) {
      allAssistants.forEach((asst) => {
        const isBusy = !!asst.activeBookingId;
        const color = isBusy ? '#F59E0B' : asst.isOnline ? '#10B981' : '#94A3B8';

        const customIcon = L.divIcon({
          className: 'custom-assistant-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden" style="background-color: ${color};">
                ${
                  asst.photo
                    ? `<img src="${asst.photo}" class="w-full h-full object-cover" />`
                    : `<span class="text-white text-xs font-bold">${asst.name.charAt(0)}</span>`
                }
              </div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[9px] text-white" style="background-color: ${color}">
                ★
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([asst.lat, asst.lng], { icon: customIcon }).addTo(markers);
        marker.bindPopup(`
          <div class="p-2 min-w-[160px] text-left">
            <div class="font-bold text-sm text-[#14213D]">${asst.name}</div>
            <div class="text-xs text-gray-500">${asst.serviceArea?.slice(0, 2).join(', ') || 'Mumbai'}</div>
            <div class="mt-1 flex items-center justify-between text-xs">
              <span class="font-semibold" style="color: ${color}">${isBusy ? 'On Booking' : asst.isOnline ? 'Available' : 'Offline'}</span>
              <span class="text-amber-500 font-bold">★ ${asst.rating || 4.9}</span>
            </div>
          </div>
        `);

        if (onAssistantClick) {
          marker.on('click', () => onAssistantClick(asst.id));
        }

        bounds.push([asst.lat, asst.lng]);
      });
    }

    if (assistantLocation) {
      const assistantIcon = L.divIcon({
        className: 'custom-pulse-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 rounded-full bg-[#F42F73]/30 pulse-animation"></div>
            <div class="relative z-10 w-9 h-9 rounded-full bg-[#F42F73] text-white flex items-center justify-center border-2 border-white shadow-xl">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="absolute -top-7 bg-[#14213D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
              Diblo Assistant
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      L.marker([assistantLocation.lat, assistantLocation.lng], { icon: assistantIcon }).addTo(markers);
      bounds.push([assistantLocation.lat, assistantLocation.lng]);
    }

    if (customerLocation) {
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
          <div class="relative flex flex-col items-center">
            <div class="w-8 h-8 rounded-full bg-[#14213D] text-white flex items-center justify-center border-2 border-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-[#F42F73]" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="w-2 h-2 bg-[#14213D] rotate-45 -mt-1 shadow"></div>
            <div class="mt-1 bg-white border border-gray-200 text-[#14213D] text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
              Your Location
            </div>
          </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 32]
      });

      L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon }).addTo(markers);
      bounds.push([customerLocation.lat, customerLocation.lng]);
    }

    if (showRoute && assistantLocation && customerLocation) {
      const routePoints: [number, number][] = [
        [assistantLocation.lat, assistantLocation.lng],
        [(assistantLocation.lat + customerLocation.lat) / 2 + 0.001, (assistantLocation.lng + customerLocation.lng) / 2 - 0.0015],
        [customerLocation.lat, customerLocation.lng]
      ];

      polylineRef.current = L.polyline(routePoints, {
        color: '#F42F73',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }
  }, [assistantLocation, customerLocation, allAssistants, showRoute]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

// ============================================================
// MAIN COMPONENT EXPORT
// ============================================================
export const MapView: React.FC<MapViewProps> = (props) => {
  const { isConfigured } = useGoogleMaps();
  const apiStatus = useApiLoadingStatus();
  const isGoogleMapsReady = isConfigured && apiStatus === APILoadingStatus.LOADED;

  const {
    height = '320px',
    etaMinutes,
    distanceKm,
    customerLocation,
    assistantLocation
  } = props;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100"
      style={{ height }}
    >
      {isGoogleMapsReady ? (
        <GoogleMapViewInner {...props} />
      ) : (
        <LeafletMapViewInner {...props} />
      )}

      {/* Realtime Live Floating Arrival Badge */}
      {etaMinutes !== undefined && (
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-gray-100 flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Arriving in</div>
            <div className="text-sm font-bold text-[#14213D] flex items-baseline gap-1">
              <span>{etaMinutes} mins</span>
              {distanceKm !== undefined && (
                <span className="text-xs text-gray-500 font-normal">({distanceKm} km away)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Platform Live Status Tag */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-gray-600 font-medium border border-gray-100 flex items-center gap-1 shadow-sm">
        <MapPin className="w-3 h-3 text-[#F42F73]" />
        <span>Mumbai Urban Transit Engine</span>
      </div>
    </div>
  );
};
