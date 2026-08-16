import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const LiveTrackingMap = ({
  customerLat,
  customerLng,
  workerLat,
  workerLng,
  workerName = "Thợ Makeup",
  workerAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  status = "MUA_MOVING"
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLineRef = useRef(null);
  const workerMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [(customerLat + workerLat) / 2, (customerLng + workerLng) / 2],
        zoom: 15,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Customer Marker
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center">
              <span class="text-[10px] text-white font-bold">BẠN</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map).bindPopup('Nhà của bạn');

      // Worker Marker
      const workerIcon = L.divIcon({
        className: 'custom-worker-pin',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10 animate-bounce">
            <div class="w-10 h-10 rounded-full border-2 border-rose-500 overflow-hidden shadow-xl">
              <img src="${workerAvatar}" class="w-full h-full object-cover" />
            </div>
            <span class="absolute -bottom-1 bg-rose-600 text-white text-[9px] font-bold px-1 rounded">MUA</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      workerMarkerRef.current = L.marker([workerLat, workerLng], { icon: workerIcon }).addTo(map);

      // Route Line
      routeLineRef.current = L.polyline(
        [
          [customerLat, customerLng],
          [workerLat, workerLng],
        ],
        { color: '#f43f5e', weight: 4, opacity: 0.8, dashArray: '8, 8' }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Real-time update of Worker Marker position & Route Line when props change
  useEffect(() => {
    if (mapInstanceRef.current && workerMarkerRef.current && routeLineRef.current) {
      workerMarkerRef.current.setLatLng([workerLat, workerLng]);
      routeLineRef.current.setLatLngs([
        [customerLat, customerLng],
        [workerLat, workerLng]
      ]);
      try {
        mapInstanceRef.current.fitBounds([
          [customerLat, customerLng],
          [workerLat, workerLng]
        ], { padding: [40, 40] });
      } catch (e) {
        // ignore bounds calculation warning if markers overlap
      }
    }
  }, [customerLat, customerLng, workerLat, workerLng]);

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/80 backdrop-blur border border-rose-500/30 text-xs text-rose-300 px-3 py-1.5 rounded-xl font-medium shadow-md">
        📍 {status === 'MUA_MOVING' ? `${workerName} đang di chuyển đến bạn...` : `${workerName} đã đến nhà bạn!`}
      </div>
    </div>
  );
};
