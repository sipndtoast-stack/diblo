import React, { useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, Shield, Clock, LocateFixed, Flag } from 'lucide-react';
import { useGoogleMapsConfig } from '../maps/GoogleMapsProvider';
import { api } from '../../lib/api';

interface MapViewProps {
  customerCoords: { lat: number; lng: number };
  assistantCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  customerAddress: string;
  destinationAddress?: string;
  assistantName?: string;
  etaMinutes?: number;
  distanceKm?: number;
  status?: string;
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

const LiveRouteController: React.FC<{
  customerCoords: { lat: number; lng: number };
  assistantCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  encodedPolyline: string | null;
}> = ({ customerCoords, assistantCoords, destinationCoords, encodedPolyline }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const origin = assistantCoords || customerCoords;
    const target = assistantCoords ? customerCoords : destinationCoords;

    if (origin && target) {
      const path = encodedPolyline ? decodePolyline(encodedPolyline) : [origin, target];
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
    bounds.extend(customerCoords);
    if (assistantCoords) bounds.extend(assistantCoords);
    if (destinationCoords) bounds.extend(destinationCoords);

    if (assistantCoords || destinationCoords) {
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else {
      map.panTo(customerCoords);
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
    customerCoords.lat,
    customerCoords.lng,
    assistantCoords?.lat,
    assistantCoords?.lng,
    destinationCoords?.lat,
    destinationCoords?.lng,
    encodedPolyline
  ]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  customerCoords,
  assistantCoords,
  destinationCoords,
  customerAddress,
  destinationAddress,
  assistantName = 'Diblo Assistant',
  etaMinutes,
  distanceKm,
  status = 'ON_THE_WAY',
  height = 'h-64 sm:h-80'
}) => {
  const { isConfigured } = useGoogleMapsConfig();
  const [routeData, setRouteData] = useState<{
    distanceText: string;
    durationText: string;
    polyline: string | null;
  } | null>(null);

  const validAssistantCoords =
    assistantCoords && assistantCoords.lat && assistantCoords.lng ? assistantCoords : null;
  const validDestCoords =
    destinationCoords && destinationCoords.lat && destinationCoords.lng ? destinationCoords : null;

  useEffect(() => {
    let mounted = true;
    const startPt = validAssistantCoords || customerCoords;
    const endPt = validAssistantCoords ? customerCoords : validDestCoords;
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
    validAssistantCoords?.lat,
    validAssistantCoords?.lng,
    customerCoords.lat,
    customerCoords.lng,
    validDestCoords?.lat,
    validDestCoords?.lng
  ]);

  const normStatus = String(status || '').toUpperCase();

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner select-none`}>
      {isConfigured ? (
        <Map
          defaultCenter={customerCoords}
          defaultZoom={15}
          mapId="DIBLO_CUSTOMER_LIVE_MAP"
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          className="w-full h-full"
        >
          <LiveRouteController
            customerCoords={customerCoords}
            assistantCoords={validAssistantCoords}
            destinationCoords={validDestCoords}
            encodedPolyline={routeData?.polyline || null}
          />

          {/* Customer Pickup Location Marker */}
          <AdvancedMarker position={customerCoords}>
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                Pickup Location
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                <MapPin className="w-5 h-5" />
              </div>
            </div>
          </AdvancedMarker>

          {/* Destination Marker if applicable */}
          {validDestCoords && (
            <AdvancedMarker position={validDestCoords}>
              <div className="flex flex-col items-center">
                <div className="bg-indigo-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap">
                  Destination
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
                  <Flag className="w-4 h-4" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {/* Live Assistant Location Marker (moves ONLY based on real GPS updates from Firebase) */}
          {validAssistantCoords && (
            <AdvancedMarker position={validAssistantCoords}>
              <div className="flex flex-col items-center">
                <div className="bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-md mb-1 whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                  {assistantName}
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

      {/* Top Live Status Pill */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/80 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-800">
            {normStatus === 'SEARCHING' || normStatus === 'PENDING'
              ? 'Finding an assistant...'
              : normStatus === 'ARRIVED'
              ? 'Assistant arrived at pickup'
              : normStatus === 'IN_PROGRESS'
              ? 'Assistance in Progress • Live GPS'
              : 'Your Assistant is on the way'}
          </span>
        </div>

        {(routeData || (etaMinutes !== undefined && etaMinutes > 0)) && (
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {routeData?.durationText || `${etaMinutes} mins`}
            </span>
            <span className="text-slate-400">•</span>
            <span>{routeData?.distanceText || `${distanceKm} km`}</span>
          </div>
        )}
      </div>

      {/* Bottom Address Strip */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{customerAddress}</p>
            {destinationAddress && (
              <p className="text-[11px] text-indigo-600 font-medium truncate">→ {destinationAddress}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
          <Shield className="w-3 h-3" />
          GPS Verified
        </div>
      </div>
    </div>
  );
};
