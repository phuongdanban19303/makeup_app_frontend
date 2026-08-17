import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleWorkerStatus, setCurrentWorkerProfile, setWorkerStatus } from '../../store/workerSlice';
import { setActiveBooking } from '../../store/bookingSlice';
import { muaApi } from '../../api/muaApi';
import { bookingApi } from '../../api/bookingApi';
import { locationApi } from '../../api/locationApi';
import { paymentApi } from '../../api/paymentApi';
import { websocketService } from '../../api/websocketService';
import { DispatchModal } from '../../components/worker/DispatchModal';
import WalletModal from '../../components/wallet/WalletModal';
import { useGpsTelemetry } from '../../hooks/useGpsTelemetry';
import { Briefcase, Power, Clock, DollarSign, MapPin, Phone, Award, Radio, Signal, User, Star, Layers, RefreshCw, Wallet, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export const MuaDashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentWorkerStatus } = useSelector((state) => state.worker);
  const { activeBooking } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.auth);

  // Activate Real-time GPS STOMP Telemetry stream
  const { isWsConnected, isTelemetryActive } = useGpsTelemetry();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);

  const [workerBalance, setWorkerBalance] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const workerId = user?.id || user?.workerId || user?.userId || null;

  const fetchWorkerBalance = async () => {
    if (!workerId) return;
    try {
      const res = await paymentApi.getWalletBalance(workerId, 'WORKER');
      const data = res.data?.data || res.data || res;
      setWorkerBalance(data.balance || 0);
    } catch (e) {
      console.warn('Lỗi tải số dư Ví Thợ:', e);
    }
  };


  // 1. Fetch real MUA Profile from API (GET /api/v1/mua/{muaId}/profile)
  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await muaApi.getProfile(workerId);
      const data = res.data || res;
      if (data) {
        setProfile(data);
        dispatch(setCurrentWorkerProfile(data));
        if (data.currentStatus) {
          dispatch(setWorkerStatus(data.currentStatus));
        }
      }
    } catch (err) {
      console.error('[MuaDashboard] Lỗi tải thông tin thợ từ API:', err);
      toast.error('Không thể tải thông tin hồ sơ thợ từ máy chủ');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchWorkerBalance();

    if (!workerId) return;

    // Persistent Active & Pending Job State Recovery on Page Load / Refresh
    const checkExistingJobs = async () => {
      try {
        // A. Check if worker has an active ongoing job -> store in state without auto-redirecting
        const activeRes = await bookingApi.getActiveBookingForWorker(workerId);
        const activeData = activeRes?.data || activeRes;
        if (activeData && (activeData.id || activeData.bookingId)) {
          const bId = activeData.bookingId || activeData.id;
          dispatch(setActiveBooking({ ...activeData, bookingId: bId }));
        }

        // B. Check if worker has pending requests -> show persistent banner
        const pendingRes = await bookingApi.getPendingBookingsForWorker(workerId);
        const pendingData = pendingRes?.data || pendingRes;
        if (Array.isArray(pendingData) && pendingData.length > 0) {
          const firstPending = pendingData[0];
          setIncomingRequest({
            bookingId: firstPending.id,
            serviceName: firstPending.serviceName || 'Makeup Dịch Vụ Khách Hàng',
            customerAddress: firstPending.address || 'Địa chỉ khách hàng',
            scheduledTime: new Date().toISOString(),
            totalPrice: firstPending.totalFee || 0,
            customerName: firstPending.customerName || 'Khách Hàng',
            customerPhone: firstPending.customerPhone || ''
          });
          setIsDispatchOpen(true);
        }
      } catch (e) {
        console.warn('[MuaDashboard] State recovery check failed:', e);
      }
    };

    checkExistingJobs();
  }, [workerId, dispatch, navigate]);


  // 2. Real-time STOMP WebSocket listener for incoming real booking requests
  useEffect(() => {
    if (currentWorkerStatus === 'ONLINE' && workerId) {
      // BẮT BUỘC: Kết nối WebSocket STOMP với server
      websocketService.connect();

      const topic1 = `/topic/worker/${workerId}`;
      const topic2 = `/topic/mua/${workerId}/alerts`;
      const topic3 = `/topic/workers/alerts`;

      const handleMessage = (message) => {
        console.log('[WebSocket-MUA] ⚡ Nhận thông báo ca đặt mới từ Server:', message);
        const bookingData = message?.data || message;
        if (bookingData && (bookingData.bookingId || bookingData.bookingCode || bookingData.payload?.bookingId)) {
          const innerPayload = bookingData.payload || bookingData;
          setIncomingRequest({
            bookingId: innerPayload.bookingId || bookingData.bookingId,
            serviceName: innerPayload.serviceName || bookingData.serviceName || 'Makeup Dịch Vụ Khách Hàng',
            customerAddress: innerPayload.address || bookingData.address || bookingData.customerAddress || 'Địa chỉ khách hàng',
            scheduledTime: innerPayload.scheduledTime || new Date().toISOString(),
            totalPrice: innerPayload.totalFee || bookingData.totalPrice || bookingData.basePackageFee || 0,
            note: innerPayload.notes || bookingData.notes || bookingData.note || '',
            customerName: innerPayload.customerName || bookingData.customerName || 'Khách Hàng',
            customerPhone: innerPayload.customerPhone || bookingData.customerPhone || ''
          });
          setIsDispatchOpen(true);
          toast.info('🚨 Có ca đặt lịch mới gửi tới bạn!');
        }
      };

      const sub1 = websocketService.subscribe(topic1, handleMessage);
      const sub2 = websocketService.subscribe(topic2, handleMessage);
      const sub3 = websocketService.subscribe(topic3, handleMessage);

      // ⚡ FAIL-SAFE FALLBACK: Polling 3s/lần kiểm tra đơn chờ duyệt từ booking-service
      const pollPendingInterval = setInterval(async () => {
        if (isDispatchOpen) return;
        try {
          const pendingRes = await bookingApi.getPendingBookingsForWorker(workerId);
          const pendingData = pendingRes?.data || pendingRes;
          if (Array.isArray(pendingData) && pendingData.length > 0) {
            const firstPending = pendingData[0];
            setIncomingRequest({
              bookingId: firstPending.id || firstPending.bookingId,
              serviceName: firstPending.serviceName || 'Makeup Dịch Vụ Khách Hàng',
              customerAddress: firstPending.address || 'Địa chỉ khách hàng',
              scheduledTime: new Date().toISOString(),
              totalPrice: firstPending.totalFee || 0,
              customerName: firstPending.customerName || 'Khách Hàng',
              customerPhone: firstPending.customerPhone || ''
            });
            setIsDispatchOpen(true);
          }
        } catch (e) {
          // Silent poll catch
        }
      }, 3000);

      return () => {
        if (sub1) sub1.unsubscribe();
        if (sub2) sub2.unsubscribe();
        if (sub3) sub3.unsubscribe();
        clearInterval(pollPendingInterval);
      };
    }
  }, [currentWorkerStatus, workerId, isDispatchOpen]);


  // 3. Toggle Online/Offline Work Status (API 2.2 & 2.3)
  const handleToggleOnline = async () => {
    const nextStatus = currentWorkerStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      if (nextStatus === 'OFFLINE') {
        // API 2.2: DELETE /api/v1/workers/location (Remove GPS from Redis GEO)
        try {
          await locationApi.deleteLocation(workerId);
        } catch (e) {
          console.warn('[LocationApi] Xóa định vị GEO thất bại:', e);
        }
      }

      // API 2.3: PUT /api/v1/mua/{muaId}/profile { currentStatus }
      await muaApi.updateProfile(workerId, {
        currentStatus: nextStatus,
        bio: profile?.bio || 'Chuyên gia trang điểm cô dâu cao cấp'
      });

      dispatch(toggleWorkerStatus());
      setProfile((prev) => prev ? { ...prev, currentStatus: nextStatus } : prev);
      toast.success(`Đã chuyển trạng thái nhận ca: ${nextStatus}`);
    } catch (err) {
      toast.error('Lỗi đổi trạng thái: ' + (err.message || ''));
    }
  };

  // 4. Accept Incoming Real Booking (API 3.1)
  const handleAcceptJob = async () => {
    if (!incomingRequest) return;
    try {
      await bookingApi.acceptBooking(incomingRequest.bookingId);
      dispatch(setActiveBooking({
        ...incomingRequest,
        status: 'ACCEPTED',
        customerName: incomingRequest.customerName || 'Khách Hàng',
        customerPhone: incomingRequest.customerPhone || ''
      }));
      setIsDispatchOpen(false);
      toast.success('Đã chấp nhận ca! Chuyển sang màn hình quản lý vòng đời ca.');
      navigate(`/worker/job/${incomingRequest.bookingId}`);
    } catch (err) {
      toast.error('Lỗi nhận ca: ' + (err.message || ''));
    }
  };

  // 5. Reject Incoming Real Booking (API 3.2)
  const handleRejectJob = async () => {
    if (incomingRequest) {
      try {
        await bookingApi.rejectBooking(incomingRequest.bookingId);
      } catch (e) {
        console.warn('Lỗi từ chối ca:', e);
      }
    }
    setIsDispatchOpen(false);
    setIncomingRequest(null);
    toast.info('Đã từ chối ca đặt lịch');
  };

  const activeProfile = profile || user;

  return (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Workbench */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              {activeProfile?.avatarUrl ? (
                <img
                  src={activeProfile.avatarUrl}
                  alt={activeProfile.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Briefcase size={28} className="text-white" />
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  currentWorkerStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  {activeProfile?.fullName || 'Chuyên Gia MUA'}
                </h1>
                <button
                  onClick={fetchProfile}
                  title="Tải lại dữ liệu API"
                  className="p-1 text-slate-400 hover:text-indigo-600 transition"
                >
                  <RefreshCw size={14} className={loadingProfile ? 'animate-spin text-indigo-600' : ''} />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                {activeProfile?.bio || 'Chuyên gia trang điểm cao cấp'}
              </p>
            </div>
          </div>

          {/* ONLINE / OFFLINE Switch Toggle Specification */}
          <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 p-2 rounded-2xl">
            <span className="text-xs font-bold text-slate-700 pl-2">
              Trạng Thái Nhận Ca:
            </span>
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentWorkerStatus === 'ONLINE'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400/50'
                  : 'bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Power size={14} />
              <span>{currentWorkerStatus === 'ONLINE' ? '🟢 ONLINE (Bật)' : '⚪ OFFLINE (Tắt)'}</span>
            </button>
          </div>
        </div>

        {/* Real-time GPS Telemetry Stream Status Banner */}
        {currentWorkerStatus === 'ONLINE' && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-500/30 p-4 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <div className="relative p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                  <Radio size={18} className="animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">GPS Telemetry Stream Active</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-md">
                    {isWsConnected ? 'STOMP WS CONNECTED' : 'REST FALLBACK ACTIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Vị trí GPS đang được tự động đồng bộ thời gian thực về hệ thống qua WebSocket <code className="text-emerald-300 bg-slate-900 px-1 rounded">/ws-location</code> & topic <code className="text-rose-300 bg-slate-900 px-1 rounded">/topic/worker/{workerId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 self-end sm:self-auto">
              <Signal size={14} className="text-emerald-400 animate-pulse" />
              <span>3-5s Ping</span>
            </div>
          </div>
        )}

        {/* Stats Grid & Worker Wallet Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <Award size={14} className="text-rose-500" /> Ca Đã Hoàn Thành
            </span>
            <p className="text-2xl font-black text-rose-600 font-mono">
              {activeProfile?.totalCompletedJobs ?? 0} Ca
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <Star size={14} className="text-amber-500 fill-amber-500" /> Đánh Giá Trung Bình
            </span>
            <p className="text-2xl font-black text-amber-600 font-mono">
              {activeProfile?.rating ? `${activeProfile.rating} / 5.0 ★` : 'Mới (Chưa có)'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-500" /> Gói Dịch Vụ Cung Cấp
            </span>
            <p className="text-2xl font-black text-indigo-600 font-mono">
              {activeProfile?.services?.length ?? 0} Dịch Vụ
            </p>
          </div>

          {/* Worker Wallet Card (Thu Nhập Ròng 85%) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl border border-indigo-500/30 text-white shadow-md space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                <Wallet size={14} className="text-rose-400" /> Ví Thu Nhập Thợ (85%)
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Sổ cái 100%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-white font-mono">
                {workerBalance.toLocaleString('vi-VN')} <span className="text-xs font-bold opacity-75">đ</span>
              </p>
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <Building2 size={13} /> Rút / Sổ Cái
              </button>
            </div>
          </div>
        </div>

        {/* Active Job & Services Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Active Job Card */}
          <div className="md:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ca Đang Đảm Nhận
            </h3>

            {activeBooking && activeBooking.status !== 'COMPLETED' && activeBooking.status !== 'CANCELLED' ? (
              <div className="bg-white p-6 rounded-3xl border border-indigo-200 space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs px-3 py-1 rounded-full font-bold">
                    Trạng thái: {activeBooking.status}
                  </span>
                  <span className="text-xs font-mono text-emerald-600 font-black">
                    {activeBooking.totalPrice?.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                  <p className="font-bold text-slate-900 text-base">{activeBooking.serviceName}</p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <MapPin size={14} className="text-rose-600" /> {activeBooking.customerAddress || activeBooking.address}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone size={14} className="text-emerald-600" /> Khách: {activeBooking.customerName || 'Khách Hàng'} ({activeBooking.customerPhone || 'N/A'})
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/worker/job/${activeBooking.bookingId}`)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition"
                >
                  Mở Màn Hình Xử Lý Vòng Đời Ca ➔
                </button>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 space-y-3 shadow-sm">
                <Clock size={32} className="mx-auto text-slate-400" />
                <p className="text-xs font-medium">
                  {currentWorkerStatus === 'ONLINE'
                    ? 'Đang lắng nghe ca mới từ khách hàng qua WebSocket real-time...'
                    : 'Hãy chuyển trạng thái ONLINE để bắt đầu nhận ca từ khách hàng.'}
                </p>
              </div>
            )}
          </div>

          {/* Real Services List from Profile */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh Sách Gói Dịch Vụ (API)
              </h3>
              <button
                onClick={() => navigate('/worker/services')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Quản lý gói
              </button>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-sm">
              {activeProfile?.services && activeProfile.services.length > 0 ? (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {activeProfile.services.map((srv, idx) => (
                    <div key={srv.id || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{srv.serviceName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{srv.estimatedDurationMinutes || 60} phút</p>
                      </div>
                      <span className="font-black font-mono text-emerald-600">
                        {srv.basePrice?.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Chưa thiết lập gói dịch vụ nào.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Real Emergency Dispatch Popup Modal */}
      <DispatchModal
        isOpen={isDispatchOpen}
        request={incomingRequest}
        onAccept={handleAcceptJob}
        onReject={handleRejectJob}
      />

      {/* Worker Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={workerId}
        userType="WORKER"
        onBalanceUpdated={(b) => setWorkerBalance(b)}
      />
    </div>
  );
};

