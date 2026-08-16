import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

export const NearbyMap = ({
  centerLat = 10.776889,
  centerLng = 106.700806,
  radiusKm = 5.0,
  workers = [],
  selectedWorkerId,
  onWorkerSelect,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const markersGroupRef = useRef(null);
  const navigate = useNavigate();

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Center, Radius Circle, and Worker Markers when props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Set view smoothly without animation conflict
    if (centerLat && centerLng) {
      map.setView([centerLat, centerLng], getZoomForRadius(radiusKm), { animate: false });
    }

    // Update Radius Circle
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    radiusCircleRef.current = L.circle([centerLat, centerLng], {
      radius: radiusKm * 1000,
      color: '#f43f5e',
      fillColor: '#f43f5e',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 8',
    }).addTo(map);

    // Update Customer Marker
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      // Customer Location Custom Pin
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const customerMarker = L.marker([centerLat, centerLng], { icon: customerIcon });
      customerMarker.bindPopup(`
        <div class="text-xs p-1">
          <p class="font-bold text-rose-400">Vị trí của bạn (Khách hàng)</p>
          <p class="text-slate-300">Bán kính đang quét: <strong>${radiusKm} km</strong></p>
        </div>
      `);
      markersGroupRef.current.addLayer(customerMarker);

      // Worker Pins
      (workers || []).forEach((worker) => {
        if (!worker || worker.latitude == null || worker.longitude == null) return;

        const isSelected = worker.workerId === selectedWorkerId;
        const fullName = worker.fullName || worker.muaName || '';
        const rating = typeof worker.rating === 'number' ? worker.rating.toFixed(1) : '0.0';
        const totalReviews = worker.totalReviews || 0;
        const avatar = worker.avatar || worker.avatarUrl || '';

        const distanceKm = typeof worker.distanceKm === 'number' ? worker.distanceKm : (worker.distanceKm || 0);

        const workerIcon = L.divIcon({
          className: 'custom-worker-pin',
          html: `
            <div class="relative group cursor-pointer transition-transform transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
              <div class="w-10 h-10 rounded-2xl overflow-hidden border-2 ${
                isSelected ? 'border-rose-500 ring-4 ring-rose-500/30' : 'border-slate-700 bg-slate-900'
              } shadow-xl">
                <img src="${avatar}" class="w-full h-full object-cover" />
              </div>
              <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                worker.currentStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'
              }"></span>
              <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-[10px] font-bold text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 shadow">
                ${distanceKm} km
              </div>
            </div>
          `,
          iconSize: [40, 48],
          iconAnchor: [20, 24],
        });

        const marker = L.marker([worker.latitude, worker.longitude], { icon: workerIcon });
        
        marker.on('click', () => {
          if (onWorkerSelect) onWorkerSelect(worker.workerId);
        });

        marker.bindPopup(`
          <div class="p-2 w-48 text-slate-100">
            <div class="flex items-center gap-2 mb-1.5">
              <img src="${avatar}" class="w-8 h-8 rounded-full object-cover ring-1 ring-rose-500" />
              <div>
                <p class="font-bold text-xs text-white leading-tight">${fullName}</p>
                <p class="text-[10px] text-amber-400 font-semibold">★ ${rating} (${totalReviews})</p>
              </div>
            </div>
            <p class="text-[11px] text-slate-300 mb-2">Cách bạn: <strong class="text-rose-400">${distanceKm} km</strong></p>
            <a href="/mua/${worker.muaId || worker.workerId}" class="block text-center bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold py-1 px-2 rounded-lg transition shadow">
              Đặt lịch ngay
            </a>
          </div>
        `);

        markersGroupRef.current.addLayer(marker);
      });
    }
  }, [centerLat, centerLng, radiusKm, workers, selectedWorkerId]);

  function getZoomForRadius(r) {
    if (r <= 1) return 15;
    if (r <= 3) return 14;
    if (r <= 5) return 13;
    return 12;
  }

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Visual Radar Indicator Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {/* Animated Radar Sweep Lines */}
        <div className="radar-circle w-72 h-72 border border-rose-500/20" />
        <div className="radar-circle w-96 h-96 border border-rose-500/10" />
        <div className="radar-sweep-line opacity-40" />
        
        {/* Radar Center Badge */}
        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-rose-500/30 text-rose-300 text-[11px] px-3 py-1.5 rounded-full font-mono shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>RADAR GPS ACTIVE • {radiusKm} KM</span>
        </div>
      </div>
    </div>
  );
};
