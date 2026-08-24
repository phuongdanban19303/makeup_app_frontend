import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setRadiusKm, setCoordinates, setGpsLocating } from '../../store/locationSlice';
import { setNearbyWorkers, setSelectedWorkerId } from '../../store/workerSlice';
import { setActiveBooking } from '../../store/bookingSlice';
import { locationApi } from '../../api/locationApi';
import { bookingApi } from '../../api/bookingApi';
import { paymentApi } from '../../api/paymentApi';
import WalletModal from '../../components/wallet/WalletModal';
import { NearbyMap } from '../../components/map/NearbyMap';
import { WorkerCard } from '../../components/worker/WorkerCard';
import { MapPin, Navigation, Radar, Sliders, Search, Sparkles, Filter, RefreshCw, List, Map as MapIcon, Activity, ChevronRight, Wallet, History, PlusCircle } from 'lucide-react';
import { reverseGeocode } from '../../utils/geoUtils';
import { toast } from 'sonner';

export const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { latitude, longitude, address, radiusKm, isGpsLocating } = useSelector((state) => state.location);
  const { nearbyWorkers, selectedWorkerId } = useSelector((state) => state.worker);
  const { user } = useSelector((state) => state.auth);
  const { activeBooking } = useSelector((state) => state.booking);

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'map' for mobile viewport

  // Customer Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletInitialTab, setWalletInitialTab] = useState('TOPUP');

  const RADIUS_OPTIONS = [1.0, 3.0, 5.0, 10.0];

  // Fetch Customer Wallet Balance
  const fetchWalletBalance = async () => {
    try {
      const customerId = user?.id || user?.userId || '1';
      const res = await paymentApi.getWalletBalance(customerId, 'CUSTOMER');
      const data = res.data?.data || res.data || res;
      setWalletBalance(data.balance || 0);
    } catch (e) {
      console.warn('[HomePage] Failed to fetch customer wallet balance:', e);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
  }, [user]);

  // Restore active customer booking on page load
  useEffect(() => {
    const customerId = user?.id || user?.userId || 1;
    const fetchCustomerActiveBooking = async () => {
      try {
        const res = await bookingApi.getActiveBookingForCustomer(customerId);
        const data = res?.data || res;
        if (data && (data.id || data.bookingId)) {
          const bId = data.bookingId || data.id;
          dispatch(setActiveBooking({ ...data, bookingId: bId }));
        }
      } catch (e) {
        console.warn('[HomePage] Failed to fetch customer active booking:', e);
      }
    };
    if (!activeBooking) {
      fetchCustomerActiveBooking();
    }
  }, [user, activeBooking, dispatch]);

  // Fetch Nearby Workers when Location or Radius changes
  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const res = await locationApi.getNearbyWorkers(latitude, longitude, radiusKm);
      if (res && res.data) {
        // Sort ascending by distanceKm (Thợ gần nhất đứng đầu)
        const sorted = [...res.data].sort((a, b) => a.distanceKm - b.distanceKm);
        dispatch(setNearbyWorkers(sorted));
      }
    } catch (err) {
      toast.error('Không thể cập nhật danh sách thợ: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [latitude, longitude, radiusKm]);

  // GPS Auto locate trigger with Real Reverse Geocoding
  const handleAutoLocate = () => {
    dispatch(setGpsLocating(true));
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const realAddress = await reverseGeocode(lat, lng);
          dispatch(setCoordinates({
            latitude: lat,
            longitude: lng,
            address: realAddress
          }));
          dispatch(setGpsLocating(false));
          toast.success('Đã định vị vị trí GPS thực của bạn');
        },
        () => {
          dispatch(setGpsLocating(false));
          toast.info('Sử dụng tọa độ mặc định: 720A Điện Biên Phủ, Bình Thạnh');
        }
      );
    } else {
      dispatch(setGpsLocating(false));
    }
  };

  // Filter workers by search query
  const filteredWorkers = (nearbyWorkers || []).filter((w) => {
    if (!w) return false;
    const fullName = w.fullName || '';
    const bio = w.bio || '';
    const query = (searchQuery || '').toLowerCase();
    return fullName.toLowerCase().includes(query) || bio.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      {/* Top Banner / Location & Radius Control Section */}
      <section className="relative overflow-hidden pt-6 pb-6 bg-gradient-to-b from-rose-100/70 via-pink-50/50 to-slate-50 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          
          {/* Customer Wallet Card Widget */}
          <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                <Wallet size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest">
                    Ví Khách Hàng
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-bold">
                    Khả dụng
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                    {walletBalance.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-rose-200">VNĐ</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setWalletInitialTab('TOPUP'); setIsWalletModalOpen(true); }}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <PlusCircle size={15} />
                <span>Nạp Tiền Ví</span>
              </button>

              <button
                onClick={() => { setWalletInitialTab('LEDGER'); setIsWalletModalOpen(true); }}
                className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <History size={15} />
                <span>Lịch Sử Giao Dịch</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Address & GPS Title Block */}
            <div className="space-y-2 max-w-xl w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-300 text-rose-700 text-xs font-bold shadow-sm">
                <Radar size={14} className="animate-spin text-rose-600" />
                <span>BẢN ĐỒ TÌM THỢ THEO BÁN KÍNH REAL-TIME</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Tìm Thợ Trang Điểm Gần Bạn
              </h1>

              {/* Current Address display bar */}
              <div className="flex items-center gap-2 bg-white border border-rose-200/80 p-2 sm:p-2.5 rounded-2xl shadow-sm w-full">
                <MapPin size={18} className="text-rose-600 flex-shrink-0 animate-pulse" />
                <span className="text-xs font-semibold text-slate-800 truncate flex-1">
                  {address}
                </span>
                <button
                  onClick={handleAutoLocate}
                  disabled={isGpsLocating}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex-shrink-0"
                >
                  <Navigation size={12} className={isGpsLocating ? 'animate-spin' : ''} />
                  <span>{isGpsLocating ? 'Đang quét...' : 'GPS'}</span>
                </button>
              </div>
            </div>

            {/* Radius Control Pill Badges Specification */}
            <div className="w-full md:w-auto bg-white border border-rose-100 p-3 sm:p-4 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Sliders size={14} className="text-rose-600" /> Chọn Bán Kính:
                </span>
                <span className="font-mono text-rose-600 font-black">{radiusKm} km</span>
              </div>

              {/* Radius Pill Badges (1km, 3km, 5km, 10km) */}
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => dispatch(setRadiusKm(r))}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition transform active:scale-95 text-center ${
                      radiusKm === r
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/30 border border-rose-400'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Search bar & View mode toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm thợ theo tên, dịch vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 shadow-sm transition"
              />
            </div>

            {/* Mobile View Toggle Switcher (List vs Map) */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              
              <div className="flex lg:hidden bg-slate-200 p-1 rounded-xl text-xs font-bold flex-1 sm:flex-initial">
                <button
                  onClick={() => setMobileTab('list')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mobileTab === 'list' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <List size={14} /> Danh sách ({filteredWorkers.length})
                </button>
                <button
                  onClick={() => setMobileTab('map')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                    mobileTab === 'map' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <MapIcon size={14} /> Bản đồ Radar
                </button>
              </div>

              <span className="hidden lg:inline text-xs text-slate-600 font-semibold">
                Tìm thấy <strong className="text-rose-600 font-bold">{filteredWorkers.length}</strong> thợ gần nhất
              </span>

              <button
                onClick={fetchWorkers}
                className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 rounded-xl transition shadow-sm"
                title="Làm mới radar"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Main Content Layout: Map & Workers List View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Workers List View (Cards sorted by distance ascending) */}
          <div className={`lg:col-span-6 space-y-4 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-rose-600" /> Danh Sách Thợ Lân Cận ({filteredWorkers.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Sắp xếp: <strong>Gần nhất trước</strong></span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-36 border border-slate-200 shadow-sm">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center space-y-3 border border-slate-200 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Radar size={24} />
                </div>
                <h4 className="text-base font-bold text-slate-900">Không tìm thấy thợ trong bán kính {radiusKm}km</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Hãy mở rộng bán kính lên 10km hoặc thay đổi địa chỉ định vị GPS để quét thợ xung quanh.
                </p>
                <button
                  onClick={() => dispatch(setRadiusKm(10.0))}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
                >
                  Mở rộng bán kính 10 km
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
                {filteredWorkers.map((worker) => (
                  <WorkerCard
                    key={worker.workerId}
                    worker={worker}
                    isSelected={worker.workerId === selectedWorkerId}
                    onSelect={() => dispatch(setSelectedWorkerId(worker.workerId))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Visual Radar & Leaflet Interactive Map View */}
          <div className={`lg:col-span-6 sticky top-20 ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Radar size={14} className="text-rose-600 animate-pulse" /> Radar Bán Kính ({radiusKm}km)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Chạm vào Marker để xem nhanh</span>
              </div>

              <div className="h-[450px] sm:h-[520px] lg:h-[680px]">
                <NearbyMap
                  centerLat={latitude}
                  centerLng={longitude}
                  radiusKm={radiusKm}
                  workers={filteredWorkers}
                  selectedWorkerId={selectedWorkerId}
                  onWorkerSelect={(id) => dispatch(setSelectedWorkerId(id))}
                />
              </div>
            </div>
          </div>

        </div>
      </main>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={user?.id || user?.userId || '1'}
        userType="CUSTOMER"
        initialTab={walletInitialTab}
        onBalanceUpdated={(b) => setWalletBalance(b)}
      />
    </div>
  );
};
