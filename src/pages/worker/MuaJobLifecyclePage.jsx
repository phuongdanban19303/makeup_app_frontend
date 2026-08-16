import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setActiveBooking, updateBookingStatus } from '../../store/bookingSlice';
import { bookingApi } from '../../api/bookingApi';
import { locationApi } from '../../api/locationApi';
import { locationTelemetryService } from '../../services/locationTelemetryService';
import { Briefcase, MapPin, Phone, CheckCircle2, Navigation, Clock, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { reverseGeocode } from '../../utils/geoUtils';
import { toast } from 'sonner';

export const MuaJobLifecyclePage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { activeBooking } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.auth);
  const workerId = user?.id || user?.workerId || user?.userId || 2;

  const [loading, setLoading] = useState(!activeBooking);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsStreamActive, setGpsStreamActive] = useState(false);

  // Restore active booking on page reload/F5 or direct URL navigation
  useEffect(() => {
    const restoreActiveJob = async () => {
      setLoading(true);
      try {
        let data = null;
        if (bookingId) {
          try {
            const res = await bookingApi.getBookingById(bookingId);
            data = res?.data || res;
          } catch (err) {
            console.warn('[MuaJobLifecycle] Cannot fetch by bookingId, trying active endpoint:', err);
          }
        }
        if (!data || !data.id) {
          const activeRes = await bookingApi.getActiveBookingForWorker(workerId);
          data = activeRes?.data || activeRes;
        }

        if (data && (data.id || data.bookingId)) {
          const bId = data.bookingId || data.id || bookingId;
          dispatch(setActiveBooking({ ...data, bookingId: bId }));
        }
      } catch (e) {
        console.warn('[MuaJobLifecycle] Cannot restore active job:', e);
      } finally {
        setLoading(false);
      }
    };

    if (!activeBooking || (bookingId && activeBooking.bookingId !== bookingId && activeBooking.id !== bookingId)) {
      restoreActiveJob();
    } else {
      setLoading(false);
    }
  }, [bookingId, workerId, dispatch]);

  const booking = activeBooking;

  // Resolve Customer street address from coordinates if generic
  const [customerAddressResolved, setCustomerAddressResolved] = useState('');
  useEffect(() => {
    let isMounted = true;
    const resolveAddr = async () => {
      const existingAddr = booking?.customerAddress || booking?.address;
      if (existingAddr && !existingAddr.includes('Vị trí GPS') && !existingAddr.includes('hiện tại')) {
        if (isMounted) setCustomerAddressResolved(existingAddr);
      } else {
        const lat = booking?.customerLat || booking?.location?.coordinates?.[1];
        const lng = booking?.customerLng || booking?.location?.coordinates?.[0];
        if (lat && lng) {
          const addr = await reverseGeocode(lat, lng);
          if (isMounted) setCustomerAddressResolved(addr);
        } else {
          if (isMounted) setCustomerAddressResolved(existingAddr || 'Địa chỉ chưa cập nhật');
        }
      }
    };
    if (booking) resolveAddr();
    return () => { isMounted = false; };
  }, [booking]);

  // Stream GPS position telemetry via STOMP WebSocket (with REST fallback) when MUA is MOVING
  useEffect(() => {
    if (booking?.status === 'MUA_MOVING') {
      setGpsStreamActive(true);
      locationTelemetryService.startTracking({
        workerId: booking.workerId || booking.muaId || null,

        status: 'MUA_MOVING',
        intervalMs: 3000,
      });
    } else {
      setGpsStreamActive(false);
      locationTelemetryService.stopTracking();
    }

    return () => {
      locationTelemetryService.stopTracking();
    };
  }, [booking?.status, booking?.bookingId, booking?.workerId]);

  if (loading) {
    return (
      <div className="min-h-screen py-16 bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Đang tải thông tin ca làm việc...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen py-16 bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Briefcase size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không Có Ca Làm Việc Nào</h2>
          <p className="text-xs text-slate-500">Hiện tại bạn chưa tiếp nhận ca làm việc nào.</p>
          <button
            onClick={() => navigate('/worker/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow"
          >
            Quay Về Bảng Công Việc
          </button>
        </div>
      </div>
    );
  }

  const handleNextState = async (actionType) => {
    setIsSubmitting(true);
    try {
      if (actionType === 'START_MOVING') {
        await bookingApi.startMoving(booking.bookingId);
        dispatch(updateBookingStatus('MUA_MOVING'));
        toast.success('Trạng thái đổi sang: MUA_MOVING (Đang di chuyển)');
      } else if (actionType === 'ARRIVED') {
        await bookingApi.arrived(booking.bookingId);
        dispatch(updateBookingStatus('ARRIVED'));
        toast.success('Trạng thái đổi sang: ARRIVED (Đã đến nhà khách)');
      } else if (actionType === 'START_MAKEUP') {
        await bookingApi.startMakeup(booking.bookingId);
        dispatch(updateBookingStatus('MAKING_UP'));
        toast.success('Trạng thái đổi sang: MAKING_UP (Bắt đầu trang điểm)');
      } else if (actionType === 'COMPLETE') {
        await bookingApi.complete(booking.bookingId);
        dispatch(updateBookingStatus('COMPLETED'));
        toast.success('Trạng thái đổi sang: COMPLETED (Hoàn thành ca!)');
      }
    } catch (err) {
      toast.error('Lỗi chuyển trạng thái: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Quản Lý Vòng Đời Ca Làm Việc</h1>
            <p className="text-xs text-slate-500 font-medium">Mã đơn: <span className="font-mono font-bold text-rose-600">{booking.bookingId}</span></p>
          </div>
          <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-full">
            Status: {booking.status}
          </span>
        </div>

        {/* Customer Address & Phone Info Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Thông Tin Khách Hàng</h3>

          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900">{booking.customerName || ''}</h4>
            <span className="text-base font-black text-emerald-600 font-mono">
              +{booking.totalPrice?.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
            <MapPin size={16} className="text-rose-600 flex-shrink-0" /> {customerAddressResolved || booking.customerAddress || booking.address}
          </p>

          <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
            <Phone size={16} className="text-emerald-600 flex-shrink-0" /> Gọi Khách: <a href={`tel:${booking.customerPhone}`} className="text-rose-600 font-mono font-bold">{booking.customerPhone || ''}</a>
          </p>

        </div>

        {/* GPS Stream Indicator */}
        {gpsStreamActive && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-medium animate-pulse shadow-sm">
            <span className="flex items-center gap-2">
              <Navigation size={16} className="text-emerald-600" /> Đang stream vị trí GPS thời gian thực về hệ thống (`/api/v1/location/stream`)...
            </span>
            <span className="font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">STREAMING ACTIVE</span>
          </div>
        )}

        {/* Action Controls for Lifecycle Stepper */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Các Bước Tiến Hành</h3>

          <div className="space-y-3">

            {/* Step 1: Start Moving */}
            <button
              onClick={() => handleNextState('START_MOVING')}
              disabled={isSubmitting || booking.status !== 'ACCEPTED'}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-xs font-bold transition ${booking.status === 'ACCEPTED'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 border-rose-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold">1</span>
                <span>Bắt Đầu Di Chuyển Đến Nhà Khách</span>
              </div>
              <Navigation size={16} />
            </button>

            {/* Step 2: Arrived */}
            <button
              onClick={() => handleNextState('ARRIVED')}
              disabled={isSubmitting || booking.status !== 'MUA_MOVING'}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-xs font-bold transition ${booking.status === 'MUA_MOVING'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 border-rose-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold">2</span>
                <span>Đã Đến Nhà Khách Hàng</span>
              </div>
              <MapPin size={16} />
            </button>

            {/* Step 3: Start Makeup */}
            <button
              onClick={() => handleNextState('START_MAKEUP')}
              disabled={isSubmitting || booking.status !== 'ARRIVED'}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-xs font-bold transition ${booking.status === 'ARRIVED'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 border-rose-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold">3</span>
                <span>Bắt Đầu Trang Điểm cho Khách</span>
              </div>
              <Sparkles size={16} />
            </button>

            {/* Step 4: Complete */}
            <button
              onClick={() => handleNextState('COMPLETE')}
              disabled={isSubmitting || booking.status !== 'MAKING_UP'}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-xs font-bold transition ${booking.status === 'MAKING_UP'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 border-emerald-400 scale-[1.01]'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-mono font-bold">4</span>
                <span>Hoàn Thành Ca Làm Việc</span>
              </div>
              <CheckCircle2 size={16} />
            </button>

          </div>
        </div>

        {booking.status === 'COMPLETED' && (
          <div className="bg-white p-6 rounded-3xl border border-emerald-200 text-center space-y-3 shadow-md">
            <CheckCircle2 size={40} className="text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-slate-900">Ca Làm Việc Đã Hoàn Thành!</h3>
            <p className="text-xs text-slate-600 font-medium">Tiền dịch vụ đã được cộng vào số dư ví của bạn.</p>
            <button
              onClick={() => navigate('/worker/dashboard')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Quay lại Bảng Công Việc
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
