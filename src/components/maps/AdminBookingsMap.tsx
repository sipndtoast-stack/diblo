import React, { useState, useEffect, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import {
  MapPin,
  Clock,
  ExternalLink,
  Filter,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Booking } from '../../types';
import { useGoogleMaps } from './GoogleMapsProvider';

interface AdminBookingsMapProps {
  bookings: Booking[];
  height?: string;
  onBookingSelect?: (bookingId: string) => void;
}

// Controller to auto-fit map bounds across all service request locations
const AdminMapBoundsController: React.FC<{
  markers: Array<{ lat: number; lng: number }>;
}> = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend(m));

    if (markers.length > 1) {
      map.fitBounds(bounds, 60);
    } else if (markers.length === 1) {
      map.setCenter(markers[0]);
      map.setZoom(14);
    }
  }, [map, markers]);

  return null;
};

const LeafletAdminBookingsMapInner: React.FC<{
  bookings: Booking[];
  onBookingSelect?: (bookingId: string) => void;
  getStatusColor: (status: string) => string;
}> = ({ bookings, onBookingSelect, getStatusColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([19.076, 72.8777], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const bounds: [number, number][] = [];

    bookings.forEach((booking) => {
      const lat = booking.location.latitude || booking.location.lat;
      const lng = booking.location.longitude || booking.location.lng;
      if (!lat || !lng) return;

      const color = getStatusColor(booking.status);
      const customIcon = L.divIcon({
        className: 'custom-admin-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer">
            <div class="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold" style="background-color: ${color}">
              ★
            </div>
            <div class="mt-0.5 bg-[#14213D] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap">
              ${booking.bookingNumber || 'Booking'}
            </div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 20]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-1 min-w-[140px] text-xs">
          <div class="font-bold text-[#14213D]">${booking.serviceTitle}</div>
          <div class="text-gray-500">${booking.location.area || 'Mumbai'}</div>
          <div class="mt-1 font-semibold" style="color: ${color}">${booking.status.replace(/_/g, ' ')}</div>
        </div>
      `);

      if (onBookingSelect) {
        marker.on('click', () => onBookingSelect(booking.id));
      }

      bounds.push([lat, lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  }, [bookings, onBookingSelect, getStatusColor]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export const AdminBookingsMap: React.FC<AdminBookingsMapProps> = ({
  bookings,
  height = '520px',
  onBookingSelect
}) => {
  const { isConfigured, authError, authErrorDetails } = useGoogleMaps();
  const apiStatus = useApiLoadingStatus();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filter bookings that have valid coordinates
  const validBookings = bookings.filter((b) => {
    const lat = b.location?.latitude || b.location?.lat;
    const lng = b.location?.longitude || b.location?.lng;
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
  });

  const filteredBookings = validBookings.filter((b) => {
    if (statusFilter === 'ACTIVE') {
      return b.status === 'ON_THE_WAY' || b.status === 'ARRIVED' || b.status === 'IN_PROGRESS';
    }
    if (statusFilter === 'PENDING') {
      return b.status === 'SEARCHING' || b.status === 'ASSIGNED' || b.status === 'ACCEPTED';
    }
    if (statusFilter === 'COMPLETED') {
      return b.status === 'COMPLETED';
    }
    return true;
  });

  const markersCoords = filteredBookings.map((b) => ({
    lat: b.location.latitude || b.location.lat,
    lng: b.location.longitude || b.location.lng
  }));

  const defaultCenter = markersCoords[0] || { lat: 19.0760, lng: 72.8777 };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'SEARCHING':
      case 'ASSIGNED':
      case 'ACCEPTED':
        return '#F42F73'; // Pink
      case 'ON_THE_WAY':
      case 'ARRIVED':
        return '#3B82F6'; // Blue
      case 'IN_PROGRESS':
        return '#F59E0B'; // Amber
      case 'COMPLETED':
        return '#10B981'; // Green
      case 'CANCELLED':
      default:
        return '#94A3B8'; // Gray
    }
  };

  const isMapLoaded = isConfigured && apiStatus === APILoadingStatus.LOADED && !authError;

  return (
    <div className="w-full space-y-3 bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-[#14213D] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#F42F73]" />
            <span>Service Request Location Dispatch Map</span>
          </h3>
          <p className="text-xs text-gray-500">
            Real-time geospatial overview of customer service requests across Mumbai
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'PENDING', 'ACTIVE', 'COMPLETED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${
                statusFilter === filter
                  ? 'bg-[#14213D] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'ALL'
                ? `All (${validBookings.length})`
                : filter === 'PENDING'
                ? 'Pending Dispatch'
                : filter === 'ACTIVE'
                ? 'Active Tasks'
                : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Map Canvas */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-xs bg-gray-100"
        style={{ height }}
      >
        {authError && (
          <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] px-3 py-1.5 bg-white/95 backdrop-blur-md border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate font-medium">Using OpenStreetMap dispatch map</span>
            </div>
          </div>
        )}

        {isMapLoaded ? (
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={12}
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
            <AdminMapBoundsController markers={markersCoords} />

            {filteredBookings.map((booking) => {
              const lat = booking.location.latitude || booking.location.lat;
              const lng = booking.location.longitude || booking.location.lng;
              const color = getStatusColor(booking.status);
              const isSelected = selectedBooking?.id === booking.id;

              return (
                <AdvancedMarker
                  key={booking.id}
                  position={{ lat, lng }}
                  onClick={() => {
                    setSelectedBooking(booking);
                    if (onBookingSelect) onBookingSelect(booking.id);
                  }}
                >
                  <div className="relative flex flex-col items-center cursor-pointer group">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform group-hover:scale-125"
                      style={{ backgroundColor: color }}
                    >
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div
                      className="w-2 h-2 rotate-45 -mt-1 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <div className="mt-0.5 bg-[#14213D] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow whitespace-nowrap opacity-90 group-hover:opacity-100">
                      {booking.bookingNumber}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Selected Booking InfoWindow */}
            {selectedBooking && (
              <InfoWindow
                position={{
                  lat: selectedBooking.location.latitude || selectedBooking.location.lat,
                  lng: selectedBooking.location.longitude || selectedBooking.location.lng
                }}
                onCloseClick={() => setSelectedBooking(null)}
              >
                <div className="p-1 max-w-xs space-y-2 text-left">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        {selectedBooking.bookingNumber}
                      </span>
                      <h4 className="text-xs font-bold text-[#14213D] leading-tight">
                        {selectedBooking.serviceName}
                      </h4>
                    </div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white uppercase"
                      style={{ backgroundColor: getStatusColor(selectedBooking.status) }}
                    >
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-600">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-[#F42F73] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{selectedBooking.location.address}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{selectedBooking.scheduledDate} &bull; {selectedBooking.startTime} ({selectedBooking.totalHours} hrs)</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Assistant: <span className="font-semibold text-gray-700">{selectedBooking.assistantName || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px]">
                    <span className="font-bold text-[#F42F73]">₹{selectedBooking.totalAmount}</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBooking.location.latitude || selectedBooking.location.lat},${selectedBooking.location.longitude || selectedBooking.location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F42F73] hover:underline font-bold flex items-center gap-0.5 text-[10px]"
                    >
                      <span>Open in Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        ) : (
          <LeafletAdminBookingsMapInner
            bookings={filteredBookings}
            selectedBooking={selectedBooking}
            onBookingSelect={(id) => {
              const b = filteredBookings.find((item) => item.id === id);
              if (b) setSelectedBooking(b);
              if (onBookingSelect) onBookingSelect(id);
            }}
            getStatusColor={getStatusColor}
          />
        )}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F42F73]" />
            <span>Pending Dispatch</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            <span>On The Way</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            <span>Completed</span>
          </div>
        </div>

        <span className="text-[10px] text-gray-400">
          Showing {filteredBookings.length} location-verified requests
        </span>
      </div>
    </div>
  );
};
