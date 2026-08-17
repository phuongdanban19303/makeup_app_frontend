import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { setActiveBooking, updateBookingStatus } from '../../store/bookingSlice';
import { bookingApi } from '../../api/bookingApi';
import { LiveTrackingMap } from '../../components/map/LiveTrackingMap';
import { Modal } from '../../components/common/Modal';
import { Activity, MapPin, Phone, User, Clock, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, RefreshCw, Navigation } from 'lucide-react';
import { toast } from 'sonner';

import { websocketService } from '../../api/websocketService';
import { reverseGeocode } from '../../utils/geoUtils';

export const OrderTrackingPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeBooking } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.auth);
  const { latitude, longitude } = useSelector((state) => state.location);
  const customerId = user?.id || user?.userId || 1;

  const [loading, setLoading] = useState(!activeBooking);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);
  const [isRejectedModalOpen, setIsRejectedModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Restore active customer booking on page reload/F5 or direct URL navigation
  React.useEffect(() => {
    const restoreCustomerJob = async () => {
      setLoading(true);
      try {
        let data = null;
        if (bookingId) {
          try {
            const res = await bookingApi.getBookingById(bookingId);
            data = res?.data || res;
          } catch (err) {
            console.warn('[OrderTracking] Cannot fetch by bookingId, trying active endpoint:', err);
          }
        }
        if (!data || !data.id) {
          const activeRes = await bookingApi.getActiveBookingForCustomer(customerId);
          data = activeRes?.data || activeRes;
        }

        if (data && (data.id || data.bookingId)) {
          const bId = data.bookingId || data.id || bookingId;
          dispatch(setActiveBooking({ ...data, bookingId: bId }));
        }
      } catch (e) {
        console.warn('[OrderTracking] Cannot restore customer booking:', e);
      } finally {
        setLoading(false);
      }
    };

    if (!activeBooking || (bookingId && activeBooking.bookingId !== bookingId && activeBooking.id !== bookingId)) {
      restoreCustomerJob();
    } else {
      setLoading(false);
    }
  }, [bookingId, customerId, dispatch]);

  const booking = activeBooking;

  // Extract Customer real coordinates from Booking or Location state
  const realCustomerLat = Number(booking?.customerLat || booking?.location?.coordinates?.[1] || latitude || 10.776889);
  const realCustomerLng = Number(booking?.customerLng || booking?.location?.coordinates?.[0] || longitude || 106.700806);

  // Real-time Worker Location State
  const [workerLocation, setWorkerLocation] = useState({
    lat: Number(booking?.workerLat || booking?.muaLat || (realCustomerLat + 0.0015)),
    lng: Number(booking?.workerLng || booking?.muaLng || (realCustomerLng + 0.0015))
  });

  // Sync initial worker location when booking changes
  React.useEffect(() => {
    if (booking?.workerLat && booking?.workerLng) {
      setWorkerLocation({
        lat: Number(booking.workerLat),
        lng: Number(booking.workerLng)
      });
    }
  }, [booking?.workerLat, booking?.workerLng]);

  // Reverse Geocode Worker Lat/Lng to real human-readable street address
  const [workerAddress, setWorkerAddress] = useState('Đang cập nhật vị trí thợ...');
  React.useEffect(() => {
    let isMounted = true;
    const fetchWorkerAddress = async () => {
      if (workerLocation.lat && workerLocation.lng) {
        const addr = await reverseGeocode(workerLocation.lat, workerLocation.lng);
        if (isMounted) setWorkerAddress(addr);
      }
    };
    fetchWorkerAddress();
    return () => { isMounted = false; };
  }, [workerLocation.lat, workerLocation.lng]);

  // Real-time STOMP WebSocket listener for worker location stream
  React.useEffect(() => {
    if (!booking) return;

    const workerId = booking.muaId || booking.workerId;
    const topicWorkerLoc = `/topic/worker/${workerId}/location`;
    const topicBookingLoc = `/topic/booking/${booking.bookingId}/location`;

    const handleWorkerLocationUpdate = (message) => {
      console.log('[WebSocket] Real-time Worker Location Update:', message);
      const payload = message?.payload || message;
      const lat = payload.lat || payload.latitude;
      const lng = payload.lng || payload.longitude;

      if (lat && lng) {
        setWorkerLocation({ lat: Number(lat), lng: Number(lng) });
      }
    };

    const sub1 = websocketService.subscribe(topicWorkerLoc, handleWorkerLocationUpdate);
    const sub2 = websocketService.subscribe(topicBookingLoc, handleWorkerLocationUpdate);

    return () => {
      if (sub1) sub1.unsubscribe();
      if (sub2) sub2.unsubscribe();
    };
  }, [booking?.bookingId, booking?.muaId, booking?.workerId]);

  // 30-Second Timeout Timer
  React.useEffect(() => {
    if (!booking || (booking.status !== 'MATCHING' && booking.status !== 'REQUESTED')) return;

    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeoutModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.bookingId, booking?.status]);

  // Real-time STOMP WebSocket listener & Auto-polling Fallback (3s) for customer status changes
  React.useEffect(() => {
    if (!booking?.bookingId) return;

    websocketService.connect();

    const targetCustId = booking.customerId || customerId || 1;
    const topic1 = `/topic/customer/${targetCustId}/status`;
    const topic2 = `/topic/booking/${booking.bookingId}`;

    const handleStatusUpdate = (message) => {
      console.log('[WebSocket] Customer Order Status Update received:', message);
      const payload = message?.payload || message;
      const newStatus = message.status || payload.status || (message.type === 'BOOKING_ACCEPTED' ? 'ACCEPTED' : null);

      if (message.type === 'BOOKING_REJECTED' || newStatus === 'REJECTED') {
        dispatch(updateBookingStatus('REJECTED'));
        setIsRejectedModalOpen(true);
        toast.error('🚨 Thợ trang điểm đã từ chối nhận ca này.');
        return;
      }

      if (newStatus && newStatus !== booking.status) {
        dispatch(updateBookingStatus(newStatus));
        if (newStatus === 'ACCEPTED') {
          setIsTimeoutModalOpen(false);
          toast.success('🎉 Thợ trang điểm đã chấp nhận đơn hàng!');
        } else {
          toast.info(`🔔 Trạng thái mới: ${newStatus}`);
        }
      }
    };

    const sub1 = websocketService.subscribe(topic1, handleStatusUpdate);
    const sub2 = websocketService.subscribe(topic2, handleStatusUpdate);

    // ⚡ FAIL-SAFE FALLBACK: Polling 3s/lần tự động truy vấn trạng thái từ booking-service
    // Đảm bảo ngay cả khi WebSocket chập chờn thì trang web VẪN TỰ ĐỘNG CẬP NHẬT không cần F5!
    const pollInterval = setInterval(async () => {
      if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
        return;
      }
      try {
        const res = await bookingApi.getBookingById(booking.bookingId);
        const data = res?.data || res;
        if (data && data.status && data.status !== booking.status) {
          console.log('[POLLING-FALLBACK] Phát hiện trạng thái mới từ API:', data.status);
          dispatch(updateBookingStatus(data.status));
          if (data.status === 'ACCEPTED') {
            setIsTimeoutModalOpen(false);
            toast.success('🎉 Thợ trang điểm đã chấp nhận đơn hàng!');
          }
        }
      } catch (e) {
        // Silent catch for poll error
      }
    }, 3000);

    return () => {
      if (sub1) sub1.unsubscribe();
      if (sub2) sub2.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [booking?.bookingId, customerId, dispatch]);

  const handleContinueWaiting = async () => {
    setIsSubmitting(true);
    try {
      await bookingApi.updateStatus(booking.bookingId, 'WAITING_FOR_MUA_CONFIRM');
      dispatch(updateBookingStatus('WAITING_FOR_MUA_CONFIRM'));
      toast.info('Đã giữ trạng thái tiếp tục chờ Thợ xác nhận.');
      setIsTimeoutModalOpen(false);
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeoutCancel = async () => {
    setIsSubmitting(true);
    try {
      await bookingApi.cancelBooking(booking.bookingId, 'Khách từ chối chờ timeout 30s');
      dispatch(updateBookingStatus('CANCELLED'));
      toast.info('Đã hủy đơn đặt lịch');
      setIsTimeoutModalOpen(false);
      navigate('/');
    } catch (err) {
      toast.error('Không thể hủy đơn: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-rose-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Đang tải thông tin đơn đặt lịch...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen py-16 bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <Activity size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không Tìm Thấy Đơn Hàng Active</h2>
          <p className="text-xs text-slate-500">Hiện tại bạn chưa có đơn đặt lịch trang điểm nào đang diễn ra.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow"
          >
            Quay Về Trang Chủ Tìm Thợ
          </button>
        </div>
      </div>
    );
  }

  const STEPS = [
    { code: 'MATCHING', label: 'Đang Tìm Thợ' },
    { code: 'ACCEPTED', label: 'Thợ Đã Nhận Ca' },
    { code: 'MUA_MOVING', label: 'Thợ Đang Di Chuyển' },
    { code: 'ARRIVED', label: 'Thợ Đã Đến Nhà' },
    { code: 'MAKING_UP', label: 'Đang Trang Điểm' },
    { code: 'COMPLETED', label: 'Hoàn Thành Ca' }
  ];

  const getStepIndex = (status) => {
    const idx = STEPS.findIndex(s => s.code === status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIndex = getStepIndex(booking.status);

  const handleCancelBooking = async () => {
    setIsSubmitting(true);
    try {
      await bookingApi.cancelBooking(booking.bookingId, cancelReason);
      dispatch(updateBookingStatus('CANCELLED'));
      toast.info('Đã hủy đơn hàng thành công');
      setIsCancelModalOpen(false);
    } catch (err) {
      toast.error('Không thể hủy đơn: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition font-bold"
          >
            <ArrowLeft size={16} /> Quay lại trang chủ
          </button>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-mono font-bold">MÃ ĐƠN: {booking.bookingId}</span>
          </div>
        </div>

        {/* Header Status Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Activity size={24} className="text-rose-600 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Theo Dõi Ca Trang Điểm Live</h2>
                <p className="text-xs text-rose-600 font-bold">Trạng thái: {booking.status}</p>
              </div>
            </div>

            {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                Hủy Đơn Hàng
              </button>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="pt-4">
            <div className="grid grid-cols-6 gap-1 relative">
              {STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.code} className="text-center space-y-2">
                    <div
                      className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition ${
                        isPassed
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      } ${isCurrent ? 'ring-4 ring-rose-300 scale-110' : ''}`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`block text-[10px] font-bold leading-tight ${isPassed ? 'text-rose-700' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Map Section */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <MapPin size={14} className="text-rose-600" /> Vị Trí Thợ Trên Bản Đồ Thời Gian Thực
          </h3>
          <LiveTrackingMap
            customerLat={realCustomerLat}
            customerLng={realCustomerLng}
            workerLat={workerLocation.lat}
            workerLng={workerLocation.lng}
            workerName={booking.muaName || 'Thợ Makeup'}
            workerAvatar={booking.muaAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400'}
            status={booking.status}
          />
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium truncate pr-2">
              <Navigation size={14} className="text-rose-500 shrink-0" />
              <span className="truncate">Vị trí thực thợ: <strong className="text-slate-900">{workerAddress}</strong></span>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold shrink-0">GPS Real-time</span>
          </div>
        </div>

        {/* Booking & Worker Contact Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Thông tin Thợ Phụ Trách</span>
            <div className="flex items-center gap-3">
              <img src={booking.muaAvatar} alt="MUA" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-rose-200" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{booking.muaName}</h4>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                  <Phone size={12} className="text-emerald-600" /> SĐT: <a href={`tel:${booking.muaPhone}`} className="text-rose-600 font-mono font-bold">{booking.muaPhone}</a>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs text-slate-700 font-medium">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Chi tiết đơn hàng</span>
            <p>Dịch vụ: <strong className="text-slate-900">{booking.serviceName}</strong></p>
            <p>Địa chỉ: <strong className="text-slate-900">{booking.customerAddress}</strong></p>
            <p>Tổng tiền: <strong className="text-rose-600 font-mono font-bold">{booking.totalPrice?.toLocaleString('vi-VN')}đ</strong></p>
          </div>
        </div>

      </div>

      {/* Cancel Modal */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="XÁC NHẬN HỦY ĐƠN HÀNG">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800 font-medium">
            <AlertTriangle size={18} className="flex-shrink-0 text-amber-600 mt-0.5" />
            <span>Hủy đơn khi Thợ đang di chuyển có thể phát sinh phí hủy ca.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Lý do hủy đơn:</label>
            <textarea
              rows={3}
              placeholder="Nhập lý do đổi lịch hoặc bận đột xuất..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-200"
            >
              Đóng
            </button>
            <button
              onClick={handleCancelBooking}
              disabled={isSubmitting}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl shadow"
            >
              Confirm Hủy Đơn
            </button>
          </div>
        </div>
      </Modal>

      {/* 30s Timeout Confirmation Modal */}
      <Modal isOpen={isTimeoutModalOpen} onClose={() => setIsTimeoutModalOpen(false)}>
        <div className="p-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600 font-bold text-lg">
            ⏳ 30s
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Thợ Chưa Phản Hồi</h3>
            <p className="text-xs text-slate-500 mt-1">
              Đã hết 30s nhưng Thợ chưa phản hồi. Bạn có muốn giữ trạng thái tiếp tục chờ Thợ xác nhận không?
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleContinueWaiting}
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-3 rounded-xl shadow"
            >
              🟢 Tiếp Tục Chờ Thợ Phản Hồi
            </button>
            <button
              onClick={handleTimeoutCancel}
              disabled={isSubmitting}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
            >
              🔴 Hủy Đơn & Tìm Thợ Khác
            </button>
          </div>
        </div>
      </Modal>

      {/* Worker Rejected Modal */}
      <Modal isOpen={isRejectedModalOpen} onClose={() => setIsRejectedModalOpen(false)}>
        <div className="p-6 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600 font-bold text-xl">
            🚨
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Thợ Đã Từ Chối Nhận Ca</h3>
            <p className="text-xs text-slate-500 mt-1">
              Rất tiếc, Thợ trang điểm đã từ chối nhận ca đặt lịch này do bận lịch đột xuất.
            </p>
          </div>
          <button
            onClick={() => {
              setIsRejectedModalOpen(false);
              navigate('/');
            }}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-3 rounded-xl shadow"
          >
            🔍 Quay Lại Tìm Thợ Khác
          </button>
        </div>
      </Modal>

    </div>
  );
};

