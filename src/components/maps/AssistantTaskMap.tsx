import React, { useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Clock,
  Route as RouteIcon,
  ExternalLink,
  Loader2,
  LocateFixed,
  Sparkles,
  Flag
} from 'lucide-react';
import { useGoogleMapsConfig } from './GoogleMapsProvider';
import { api } from '../../lib/api';

interface AssistantTaskMapProps {
  assistantLocation?: {
    lat: number;
    lng: number;
    address?: string;
    area?: string;
  } | null;
  customerLocation: {
    lat: number;
    lng: number;
    address: string;
    area: string;
    landmark?: string;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
    address: string;
    area?: string;
  } | null;
  customerName?: string;
  assistantName?: string;
  bookingStatus?: string;
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

const RouteLineRenderer: React.FC<{
  origin?: { lat: number; lng: number } | null;
  pickup: { lat: number; lng: number };
  destination?: { lat: number; lng: number } | null;
  encodedPolyline: string | null;
}> = ({ origin, pickup, destination, encodedPolyline }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const startPoint = origin || pickup;
    const endPoint = origin ? pickup : destination;

    if (startPoint && endPoint) {
      const path = encodedPolyline ? decodePolyline(encodedPolyline) : [startPoint, endPoint];
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
    if (origin) bounds.extend(origin);
    bounds.extend(pickup);
    if (destination) bounds.extend(destination);

    if (origin || destination) {
      map.fitBounds(bounds, { top: 55, right: 55, bottom: 55, left: 55 });
    } else {
      map.panTo(pickup);
      map.setZoom(15);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [
    map,
    origin?.lat,
    origin?.lng,
    pickup.lat,
    pickup.lng,
    destination?.lat,
    destination?.lng,
    encodedPolyline
  ]);

  return null;
};

export const AssistantTaskMap: React.FC<AssistantTaskMapProps> = ({
  assistantLocation,
  customerLocation,
  destinationLocation,
  customerName = 'Customer',
  assistantName = 'Assistant',
  bookingStatus = 'accepted',
  height = '260px'
}) => {
  const { isConfigured } = useGoogleMapsConfig();

  const [routeData, setRouteData] = useState<{
    distanceText: string;
    durationText: string;
    polyline: string | null;
  } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);

  const pickupCoords = {
    lat: customerLocation.lat || 19.0607,
    lng: customerLocation.lng || 72.8258
  };

  const assistantCoords =
    assistantLocation && assistantLocation.lat && assistantLocation.lng
      ? { lat: assistantLocation.lat, lng: assistantLocation.lng }
      : null;

  const destCoords =
    destinationLocation && destinationLocation.lat && destinationLocation.lng
      ? { lat: destinationLocation.lat, lng: destinationLocation.lng }
      : null;

  useEffect(() => {
    let mounted = true;
    const startPt = assistantCoords || pickupCoords;
    const endPt = assistantCoords ? pickupCoords : destCoords;

    if (!endPt) {
      setRouteData(null);
      return;
    }

    setIsLoadingRoute(true);
    api
      .getRoute(startPt.lat, startPt.lng, endPt.lat, endPt.lng, 'TWO_WHEELER')
      .then((res) => {
        if (!mounted) return;
        setRouteData({
          distanceText: res.distanceText,
          durationText: res.durationText,
          polyline: res.polyline
        });
        setIsLoadingRoute(false);
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoadingRoute(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    assistantCoords?.lat,
    assistantCoords?.lng,
    pickupCoords.lat,
    pickupCoords.lng,
    destCoords?.lat,
    destCoords?.lng
  ]);

  const openInGoogleMaps = () => {
    const target = destCoords && !assistantCoords ? destCoords : pickupCoords;
    const originParam = assistantCoords ? `&origin=${assistantCoords.lat},${assistantCoords.lng}` : '';
    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${target.lat},${target.lng}&travelmode=two-wheeler`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const center = assistantCoords
    ? {
        lat: (assistantCoords.lat + pickupCoords.lat) / 2,
        lng: (assistantCoords.lng + pickupCoords.lng) / 2
      }
    : pickupCoords;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Top Route Telemetry Bar */}
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            {isLoadingRoute ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RouteIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                {bookingStatus === 'ARRIVED' || bookingStatus === 'arrived'
                  ? 'Arrived at Pickup'
                  : bookingStatus === 'IN_PROGRESS' || bookingStatus === 'in_progress'
                  ? 'Assistance in Progress'
                  : 'Google Routes Live Dispatch'}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                <Sparkles className="w-2.5 h-2.5" /> Live
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm font-black text-white flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {routeData?.durationText || 'Live GPS'}
              </span>
              {routeData?.distanceText && (
                <>
                  <span className="text-xs text-slate-300 font-semibold">•</span>
                  <span className="text-xs font-bold text-emerald-400">{routeData.distanceText}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openInGoogleMaps}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Navigate</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </button>
      </div>

      {/* Real Google Map Viewport */}
      <div className="relative w-full bg-slate-100" style={{ height }}>
        {isConfigured ? (
          <Map
            defaultCenter={center}
            defaultZoom={14}
            mapId="DIBLO_ASSISTANT_TASK_MAP"
            gestureHandling="greedy"
            disableDefaultUI={false}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            className="w-full h-full"
          >
            <RouteLineRenderer
              origin={assistantCoords}
              pickup={pickupCoords}
              destination={destCoords}
              encodedPolyline={routeData?.polyline || null}
            />

            {/* Assistant Live Location Marker (only shown when real GPS location exists) */}
            {assistantCoords && (
              <AdvancedMarker position={assistantCoords}>
                <div className="flex flex-col items-center">
                  <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                    {assistantName} (Live GPS)
                  </div>
                  <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                    <LocateFixed className="w-4 h-4" />
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* Customer Pickup Marker */}
            <AdvancedMarker position={pickupCoords}>
              <div className="flex flex-col items-center">
                <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                  Pickup: {customerName}
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>

            {/* Destination Marker if provided */}
            {destCoords && (
              <AdvancedMarker position={destCoords}>
                <div className="flex flex-col items-center">
                  <div className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                    Destination
                  </div>
                  <div className="w-9 h-9 rounded-full bg-amber-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                    <Flag className="w-4 h-4" />
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
      </div>

      {/* Location Address Strip */}
      <div className="p-3 bg-white border-t border-slate-100 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                Pickup: {customerLocation.area || 'Mumbai'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {pickupCoords.lat.toFixed(4)}°N, {pickupCoords.lng.toFixed(4)}°E
              </span>
            </div>
            <p className="text-xs text-slate-600 truncate mt-0.5">{customerLocation.address}</p>
            {customerLocation.landmark && (
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                Landmark: {customerLocation.landmark}
              </p>
            )}
          </div>
        </div>

        {destinationLocation && destinationLocation.address && (
          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Flag className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Destination: {destinationLocation.area || 'Mumbai'}
                </span>
                {destCoords && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {destCoords.lat.toFixed(4)}°N, {destCoords.lng.toFixed(4)}°E
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">{destinationLocation.address}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
