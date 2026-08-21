import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setActiveBooking } from '../../store/bookingSlice';
import { pricingApi } from '../../api/pricingApi';
import { bookingApi } from '../../api/bookingApi';
import { paymentApi } from '../../api/paymentApi';
import { MapPin, Calendar, Clock, CreditCard, Wallet, Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { setAddress } from '../../store/locationSlice';
import { reverseGeocode } from '../../utils/geoUtils';
import { toast } from 'sonner';
import WalletModal from '../../components/wallet/WalletModal';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { draftCheckout } = useSelector((state) => state.booking);
  const { address, latitude, longitude } = useSelector((state) => state.location);
  const { user } = useSelector((state) => state.auth);

  const [customerAddress, setCustomerAddress] = useState(address);
  const [paymentMethod, setPaymentMethod] = useState('E_WALLET'); // 'E_WALLET' | 'CASH' | 'VNPAY'
  const [walletBalance, setWalletBalance] = useState(0);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    fetchWalletBalance();
  }, [user]);

  const fetchWalletBalance = async () => {
    try {
      const currentUserId = user?.id || user?.userId || '1';
      const res = await paymentApi.getWalletBalance(currentUserId, 'CUSTOMER');
      const data = res.data?.data || res.data || res;
      setWalletBalance(data.balance || 0);
    } catch (e) {
      console.warn('Không thể lấy số dư ví:', e);
    }
  };

  // Auto-resolve real street address from GPS coordinates if address is generic
  useEffect(() => {
    let isMounted = true;
    const resolveRealAddress = async () => {
      if (latitude && longitude) {
        if (!customerAddress || customerAddress.includes('Vị trí GPS') || customerAddress.includes('hiện tại')) {
          const realAddr = await reverseGeocode(latitude, longitude);
          if (isMounted && realAddr) {
            setCustomerAddress(realAddr);
            dispatch(setAddress(realAddr));
          }
        }
      }
    };
    resolveRealAddress();
    return () => { isMounted = false; };
  }, [latitude, longitude, customerAddress, dispatch]);
  const [scheduledTime, setScheduledTime] = useState(draftCheckout?.scheduledTime || new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [note, setNote] = useState('');

  const initialServicePrice = draftCheckout?.service?.defaultTotalPrice || draftCheckout?.service?.basePrice || draftCheckout?.service?.price || 0;

  const [pricing, setPricing] = useState({
    basePackageFee: draftCheckout?.service?.basePackageFee || draftCheckout?.service?.basePrice || 0,
    optionsFee: draftCheckout?.service?.optionsFee || 0,
    packageSubtotal: initialServicePrice,
    travelDistanceFee: 0,
    surgeMultiplier: 1.0,
    totalFee: initialServicePrice,
  });


  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recalculate price when checkout data changes (API 3.1)
  useEffect(() => {
    const calc = async () => {
      if (!draftCheckout?.service) return;
      try {
        const basePackageFee = draftCheckout?.service?.basePackageFee || draftCheckout?.service?.basePrice || 0;
        const optionsFee = draftCheckout?.service?.optionsFee || 0;
        const distanceInKm = draftCheckout?.worker?.distanceKm || 0;

        const res = await pricingApi.calculatePrice({
          servicePackageId: String(draftCheckout.service.id || draftCheckout.service.serviceId),
          basePackageFee,
          optionsFee,
          distanceInKm,
          customerLat: latitude ?? null,
          customerLng: longitude ?? null
        });

        const data = res.data || res;
        if (data && data.totalFee) {
          setPricing(data);
        } else {
          setPricing({
            basePackageFee,
            optionsFee,
            packageSubtotal: basePackageFee + optionsFee,
            travelDistanceFee: Math.round(distanceInKm * 15000),
            surgeMultiplier: 1.0,
            totalFee: basePackageFee + optionsFee + Math.round(distanceInKm * 15000),
          });
        }
      } catch (err) {
        console.warn('Dùng fallback tính giá client:', err.message);
        const basePackageFee = draftCheckout?.service?.basePackageFee || draftCheckout?.service?.basePrice || 0;
        const optionsFee = draftCheckout?.service?.optionsFee || 0;
        const distanceInKm = draftCheckout?.worker?.distanceKm || 0;
        setPricing({
          basePackageFee,
          optionsFee,
          packageSubtotal: basePackageFee + optionsFee,
          travelDistanceFee: Math.round(distanceInKm * 15000),
          surgeMultiplier: 1.0,
          totalFee: basePackageFee + optionsFee + Math.round(distanceInKm * 15000),
        });
      }
    };
    calc();
  }, [draftCheckout, latitude, longitude]);

  const handleConfirmBooking = async () => {
    if (!draftCheckout?.service) {
      toast.error('Vui lòng chọn lại dịch vụ trang điểm');
      navigate('/');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalAmount = pricing.totalFee || pricing.finalPrice || draftCheckout?.service?.defaultTotalPrice || draftCheckout?.service?.basePrice || draftCheckout?.service?.price || 0;


      const customerName = user?.fullName || user?.name || user?.username || '';
      const customerPhone = user?.phone || user?.phoneNumber || user?.phoneNo || '';

      let finalAddress = customerAddress;
      if (!finalAddress || finalAddress.includes('Vị trí GPS') || finalAddress.includes('hiện tại')) {
        if (latitude && longitude) {
          finalAddress = await reverseGeocode(latitude, longitude);
          setCustomerAddress(finalAddress);
          dispatch(setAddress(finalAddress));
        }
      }

      // Kiểm tra số dư nếu chọn Ví Điện Tử
      if (paymentMethod === 'E_WALLET' && walletBalance < finalAmount) {
        toast.error(`Số dư Ví (${walletBalance.toLocaleString('vi-VN')}đ) không đủ thanh toán (${finalAmount.toLocaleString('vi-VN')}đ). Vui lòng Nạp tiền VNPay!`);
        setIsWalletModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create Booking Request (POST /api/v1/bookings/request) with snapshot options
      const bookingRes = await bookingApi.createRequest({
        servicePackageId: draftCheckout.service.id || draftCheckout.service.serviceId,
        serviceName: draftCheckout.service.serviceName,
        basePackageFee: pricing.basePackageFee,
        optionsFee: pricing.optionsFee,
        selectedOptions: draftCheckout.service.selectedOptions || [],
        muaId: draftCheckout.worker?.userId || draftCheckout.worker?.id || draftCheckout.worker?.muaId || draftCheckout.worker?.workerId || null,

        customerName,
        customerPhone,
        customerLat: latitude ?? null,
        customerLng: longitude ?? null,
        address: finalAddress,
        notes: note,
        paymentMethod
      });



      const resData = bookingRes?.data || bookingRes;
      const realBookingId = resData?.id || resData?.bookingId || resData?.bookingCode;
      const newBooking = { ...resData, bookingId: realBookingId };

      // Step 2: Process Payment if E_WALLET or VNPAY (POST /api/v1/payments/process)
      if (paymentMethod !== 'CASH') {
        try {
          await paymentApi.processPayment({
            bookingId: newBooking.bookingId,
            amount: finalAmount,
            paymentMethod
          });
        } catch (pe) {
          console.warn('Thanh toán fallback mock:', pe.message);
        }
      }

      dispatch(setActiveBooking({
        ...newBooking,
        serviceName: draftCheckout.service.serviceName,
        totalPrice: finalAmount,
        customerAddress,
        muaName: draftCheckout.worker?.fullName || draftCheckout.worker?.muaName || '',
        muaAvatar: draftCheckout.worker?.avatar || draftCheckout.worker?.avatarUrl || '',
        muaPhone: draftCheckout.worker?.phone || '',

        paymentMethod,
        selectedOptions: draftCheckout.service.selectedOptions || []
      }));

      toast.success('Đặt lịch ca trang điểm thành công!');
      navigate(`/booking/track/${newBooking.bookingId}`);
    } catch (err) {
      toast.error('Đặt lịch thất bại: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draftCheckout?.service) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-500 font-medium">Bạn chưa chọn dịch vụ makeup nào.</p>
        <button onClick={() => navigate('/')} className="bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
          Quay lại chọn Thợ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <h1 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <CreditCard className="text-rose-600" /> Xác Nhận Đặt Lịch & Thanh Toán
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left Column: Form Details */}
          <div className="md:col-span-7 space-y-6">

            {/* Service & Worker Summary + Options Snapshot */}
            <div className="bg-white p-5 rounded-3xl space-y-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest block">
                Dịch vụ & Options Đã Chọn
              </span>

              <div className="flex items-center gap-3">
                <img
                  src={draftCheckout.worker?.avatar || draftCheckout.worker?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt="MUA"
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-rose-200"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-base">{draftCheckout.service?.serviceName}</h3>
                  <p className="text-xs text-slate-600">Thợ trang điểm: <strong className="text-slate-800">{draftCheckout.worker?.fullName}</strong></p>
                </div>
              </div>

              {/* Selected options snapshot list */}
              {draftCheckout.service?.selectedOptions && draftCheckout.service.selectedOptions.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Chi tiết các bước chọn (Order Snapshot):
                  </span>
                  {draftCheckout.service.selectedOptions.map((opt, i) => (
                    <div key={i} className="flex justify-between text-slate-700 font-medium">
                      <span>• {opt.optionName} ({opt.optionType === 'COMPONENT' ? 'Mặc định' : 'Mua thêm'})</span>
                      <span className="font-mono text-slate-900">+{opt.price?.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Address & Scheduled Time Inputs */}
            <div className="bg-white p-5 rounded-3xl space-y-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Địa điểm & Thời gian</span>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <MapPin size={14} className="text-rose-600" /> Địa chỉ nhận dịch vụ trang điểm:
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={14} className="text-amber-600" /> Ngày & Giờ hẹn thợ làm:
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú cho Thợ (Phong cách, tone makeup...):</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Trang điểm tone cam đào nhẹ nhàng, tôn dáng mặt tròn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white p-5 rounded-3xl space-y-3 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-widest">Phương thức thanh toán</span>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('E_WALLET')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1.5 ${paymentMethod === 'E_WALLET'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <Wallet size={20} className="text-rose-600" /> Ví Điện Tử
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1.5 ${paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <Banknote size={20} className="text-emerald-600" /> Tiền Mặt
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1.5 ${paymentMethod === 'VNPAY'
                      ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <CreditCard size={20} className="text-pink-600" /> VNPay Sandbox
                </button>
              </div>

              {/* Wallet Info & Quick Top-Up Widget */}
              {paymentMethod === 'E_WALLET' && (
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between text-xs animate-fadeIn">
                  <div>
                    <span className="text-slate-500 text-[11px] block font-medium">Số dư ví khả dụng:</span>
                    <span className="font-mono font-black text-rose-700 text-sm">
                      {walletBalance.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWalletModalOpen(true)}
                    className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1"
                  >
                    <Wallet size={14} /> Nạp VNPay / Ví
                  </button>
                </div>
              )}

              {paymentMethod === 'CASH' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-800 font-medium animate-fadeIn">
                  💡 Bạn sẽ thanh toán 100% tiền mặt trực tiếp cho Thợ makeup sau khi ca hoàn thành.
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Pricing Breakdown & Action */}
          <div className="md:col-span-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 sticky top-20 shadow-md">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Chi Tiết Thanh Toán
              </h3>

              <div className="space-y-2.5 text-xs text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền công cốt lõi (Base):</span>
                  <span className="font-mono text-slate-900">{(pricing.basePackageFee || 200000).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phụ phí options & add-ons:</span>
                  <span className="font-mono text-slate-900">+{(pricing.optionsFee || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-700 pt-1 border-t border-slate-100">
                  <span>Tiền gói dịch vụ:</span>
                  <span className="font-mono">{(pricing.packageSubtotal || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phí di chuyển tận nhà:</span>
                  <span className="font-mono text-slate-900">+{(pricing.travelDistanceFee).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Tổng thanh toán:</span>
                  <span className="text-xl font-black text-rose-600 font-mono">
                    {(pricing.totalFee || pricing.finalPrice || 0).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Bảo mật 100%
                </span>
              </div>

              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition transform hover:scale-[1.02] active:scale-98"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Xác Nhận Đặt Lịch Ca Makeup</span>
                  </>
                )}
              </button>

            </div>
          </div>

        </div>

      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={user?.id || user?.userId || '1'}
        userType="CUSTOMER"
        onBalanceUpdated={(b) => setWalletBalance(b)}
      />
    </div>
  );
};

