import React, { useState, useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, ShieldCheck, LocateFixed, Sparkles, Flag } from 'lucide-react';
import { AssistantProfile, BookingStatus } from '../../types';
import { useGoogleMapsConfig } from '../maps/GoogleMapsProvider';
import { api } from '../../lib/api';

interface MapViewProps {
  customerLocation?: { lat: number; lng: number; address?: string; area?: string };
  assistantLocation?: { lat: number; lng: number; address?: string; area?: string } | null;
  destinationLocation?: { lat: number; lng: number; address?: string; area?: string } | null;
  assistants?: AssistantProfile[];
  etaMinutes?: number;
  distanceKm?: number;
  bookingStatus?: BookingStatus | string;
  assistantName?: string;
  interactive?: boolean;
  onSelectLocation?: (loc: { lat: number; lng: number; area: string; address: string }) => void;
  height?: string;
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
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

const CommonMapRouteController: React.FC<{
  customerPos: { lat: number; lng: number };
  assistantPos?: { lat: number; lng: number } | null;
  destPos?: { lat: number; lng: number } | null;
  encodedPolyline: string | null;
}> = ({ customerPos, assistantPos, destPos, encodedPolyline }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const startPt = assistantPos || customerPos;
    const endPt = assistantPos ? customerPos : destPos;

    if (startPt && endPt) {
      const path = encodedPolyline ? decodePolyline(encodedPolyline) : [startPt, endPt];
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

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(customerPos);
    if (assistantPos) bounds.extend(assistantPos);
    if (destPos) bounds.extend(destPos);

    if (assistantPos || destPos) {
      map.fitBounds(bounds, { top: 55, right: 55, bottom: 55, left: 55 });
    } else {
      map.panTo(customerPos);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [
    map,
    customerPos.lat,
    customerPos.lng,
    assistantPos?.lat,
    assistantPos?.lng,
    destPos?.lat,
    destPos?.lng,
    encodedPolyline
  ]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  customerLocation = { lat: 19.0607, lng: 72.8258, address: 'Bandra West, Mumbai', area: 'Bandra West' },
  assistantLocation,
  destinationLocation,
  assistants = [],
  etaMinutes,
  distanceKm,
  bookingStatus,
  assistantName = 'Rajesh Sharma',
  interactive = false,
  onSelectLocation,
  height = 'h-72'
}) => {
  const { isConfigured } = useGoogleMapsConfig();
  const [selectedLoc, setSelectedLoc] = useState(customerLocation);
  const [routeData, setRouteData] = useState<{
    distanceText: string;
    durationText: string;
    polyline: string | null;
  } | null>(null);

  useEffect(() => {
    if (customerLocation?.lat && customerLocation?.lng) {
      setSelectedLoc(customerLocation);
    }
  }, [customerLocation?.lat, customerLocation?.lng, customerLocation?.address]);

  const validAssistantPos =
    assistantLocation && assistantLocation.lat && assistantLocation.lng
      ? { lat: assistantLocation.lat, lng: assistantLocation.lng }
      : null;

  const validDestPos =
    destinationLocation && destinationLocation.lat && destinationLocation.lng
      ? { lat: destinationLocation.lat, lng: destinationLocation.lng }
      : null;

  const normStatus = String(bookingStatus || '').toUpperCase();
  const isTrackingActive =
    normStatus === 'ON_THE_WAY' ||
    normStatus === 'ARRIVED' ||
    normStatus === 'IN_PROGRESS' ||
    normStatus === 'ASSIGNED' ||
    normStatus === 'ACCEPTED';

  useEffect(() => {
    let mounted = true;
    const startPt = validAssistantPos || { lat: selectedLoc.lat, lng: selectedLoc.lng };
    const endPt = validAssistantPos ? { lat: selectedLoc.lat, lng: selectedLoc.lng } : validDestPos;

    if (!endPt) {
      setRouteData(null);
      return;
    }

    api
      .getRoute(startPt.lat, startPt.lng, endPt.lat, endPt.lng, 'TWO_WHEELER')
      .then((res) => {
        if (!mounted) return;
        setRouteData({
          distanceText: res.distanceText,
          durationText: res.durationText,
          polyline: res.polyline
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [
    validAssistantPos?.lat,
    validAssistantPos?.lng,
    selectedLoc.lat,
    selectedLoc.lng,
    validDestPos?.lat,
    validDestPos?.lng
  ]);

  const handleMapClick = async (e: any) => {
    if (!interactive) return;
    const latLng = e?.detail?.latLng;
    if (latLng && typeof latLng.lat === 'number' && typeof latLng.lng === 'number') {
      const lat = Number(latLng.lat.toFixed(6));
      const lng = Number(latLng.lng.toFixed(6));
      const geo = await api.reverseGeocode(lat, lng);
      const updated = {
        lat: geo.lat,
        lng: geo.lng,
        area: geo.area,
        address: geo.formattedAddress
      };
      setSelectedLoc(updated);
      onSelectLocation?.(updated);
    }
  };

  const handleUseCurrentGps = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const geo = await api.reverseGeocode(lat, lng);
        const updated = {
          lat: geo.lat,
          lng: geo.lng,
          area: geo.area,
          address: geo.formattedAddress
        };
        setSelectedLoc(updated);
        onSelectLocation?.(updated);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-100 select-none`}>
      {isConfigured ? (
        <Map
          defaultCenter={{ lat: selectedLoc.lat || 19.0607, lng: selectedLoc.lng || 72.8258 }}
          defaultZoom={14}
          mapId="DIBLO_COMMON_LIVE_MAP"
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          onClick={handleMapClick}
          className="w-full h-full"
        >
          <CommonMapRouteController
            customerPos={{ lat: selectedLoc.lat || 19.0607, lng: selectedLoc.lng || 72.8258 }}
            assistantPos={validAssistantPos}
            destPos={validDestPos}
            encodedPolyline={routeData?.polyline || null}
          />

          {/* Customer Pickup Location Marker */}
          <AdvancedMarker position={{ lat: selectedLoc.lat || 19.0607, lng: selectedLoc.lng || 72.8258 }}>
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {selectedLoc.area || 'Pickup Location'}
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </AdvancedMarker>

          {/* Destination Marker if provided */}
          {validDestPos && (
            <AdvancedMarker position={validDestPos}>
              <div className="flex flex-col items-center">
                <div className="bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap mb-1">
                  Destination: {destinationLocation?.area || 'Drop'}
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <Flag className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Online Assistants Markers when browsing */}
          {!isTrackingActive &&
            assistants
              .filter((a) => a.isOnline && a.currentLocation?.lat && a.currentLocation?.lng)
              .map((asst) => (
                <AdvancedMarker
                  key={asst.id}
                  position={{ lat: asst.currentLocation.lat, lng: asst.currentLocation.lng }}
                >
                  <div className="flex flex-col items-center group">
                    <div className="bg-indigo-950/90 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-1">
                      {asst.name.split(' ')[0]} ★{asst.rating}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

          {/* Active Assistant Live GPS Marker */}
          {validAssistantPos && (
            <AdvancedMarker position={validAssistantPos}>
              <div className="flex flex-col items-center">
                <div className="bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap mb-1 border border-indigo-400">
                  <Navigation className="w-3 h-3 text-amber-300" />
                  <span>{assistantName}</span>
                  {(routeData?.durationText || etaMinutes) && (
                    <span className="bg-indigo-800 px-1.5 py-0.2 rounded text-[10px] text-amber-300">
                      {routeData?.durationText || `${etaMinutes} min`}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <LocateFixed className="w-5 h-5" />
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-500">
          Loading Google Maps...
        </div>
      )}

      {/* Top Overlay Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-2 pointer-events-auto">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            {isTrackingActive ? 'Google Maps • Live Assistant Tracking' : 'Google Maps • Real-Time Dispatch'}
          </span>
        </div>

        {(routeData || (etaMinutes !== undefined && etaMinutes > 0)) && (
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold">
                {normStatus === 'ARRIVED'
                  ? 'Arrived at Pickup'
                  : `ETA: ${routeData?.durationText || `${etaMinutes} mins`}`}
              </span>
            </div>
            {(routeData?.distanceText || distanceKm) && (
              <>
                <div className="h-3 w-px bg-slate-700" />
                <span className="text-[11px] text-slate-300 font-medium">
                  {routeData?.distanceText || `${distanceKm} km`}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Interactive GPS Button */}
      {interactive && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm border border-slate-200/80 text-xs text-slate-600 truncate max-w-[70%] pointer-events-auto">
            <span className="font-semibold text-slate-900">Selected: </span>
            {selectedLoc.address || `${selectedLoc.area || 'Mumbai'}`}
          </div>
          <button
            type="button"
            onClick={handleUseCurrentGps}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition pointer-events-auto"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            Use Current GPS
          </button>
        </div>
      )}
    </div>
  );
};
