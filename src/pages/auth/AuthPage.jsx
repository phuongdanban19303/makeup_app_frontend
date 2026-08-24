import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../../store/authSlice';
import { authApi } from '../../api/authApi';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../../config/firebase';
import { Sparkles, Phone, Lock, User, Mail, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'MUA'

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Nguyen Van A');
  const [email, setEmail] = useState('user@example.com');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }
    const toastId = toast.loading('Đang khởi tạo SMS OTP qua Firebase...');
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
      // Định dạng số điện thoại chuẩn quốc tế (0364852922 -> +84364852922)
      const formattedPhone = phone.startsWith('0') ? '+84' + phone.slice(1) : phone;

      // Gửi SMS thật về điện thoại từ Firebase Auth
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast.success(`Đã gửi tin nhắn SMS OTP thật về điện thoại ${formattedPhone}`, { id: toastId });
    } catch (error) {
      console.error('Lỗi gửi SMS OTP Firebase:', error);
      const isBillingError = error.message?.includes('BILLING_NOT_ENABLED');
      const isRegionError = error.message?.includes('OPERATION_NOT_ALLOWED') || error.code === 'auth/operation-not-allowed';

      // Fallback tự động lấy mã OTP từ Backend khi Firebase cần Billing / chưa bật vùng
      try {
        const res = await authApi.sendOtp(phone);
        setOtpSent(true);
        if (res?.data?.otp) {
          setOtpCode(res.data.otp);
        }
        if (isBillingError) {
          toast.warning('Firebase cần thêm SĐT thử nghiệm hoặc bật Billing. Đã dùng mã OTP thử nghiệm: ' + (res?.data?.otp || '123456'), { id: toastId, duration: 8000 });
        } else if (isRegionError) {
          toast.warning('Firebase chưa bật SMS vùng Việt Nam (+84). Đã dùng mã OTP thử nghiệm: ' + (res?.data?.otp || '123456'), { id: toastId, duration: 8000 });
        } else {
          toast.info(`Mã OTP hệ thống thử nghiệm: ${res?.data?.otp || '123456'}`, { id: toastId });
        }
      } catch (fallbackErr) {
        toast.error('Gửi SMS OTP thất bại: ' + (error.message || 'Lỗi kết nối'), { id: toastId });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        let firebaseIdToken = null;

        // 1. Xác minh mã OTP 6 số từ Firebase SMS nếu có
        const confirmationResult = window.confirmationResult;
        if (confirmationResult && otpCode) {
          const toastId = toast.loading('Đang xác thực mã OTP...');
          try {
            const result = await confirmationResult.confirm(otpCode);
            firebaseIdToken = await result.user.getIdToken();
            toast.success('Xác nhận OTP Firebase thành công!', { id: toastId });
          } catch (otpErr) {
            toast.error('Mã OTP không chính xác: ' + (otpErr.message || ''), { id: toastId });
            setIsSubmitting(false);
            return;
          }
        }

        // 2. Gửi firebaseIdToken và thông tin đăng ký tới Backend user-service
        const res = await authApi.register({
          phone,
          email,
          fullName,
          password,
          otpCode: otpCode || '123456',
          firebaseIdToken: firebaseIdToken || null,
          role
        });

        if (res && res.data) {
          dispatch(setCredentials({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            userId: res.data.userId,
            roles: res.data.roles,
            user: {
              id: res.data.userId,
              fullName: res.data.fullName,
              phoneNumber: res.data.phone,
              email,
              userRole: role
            }
          }));
          toast.success('Đăng ký tài khoản thành công!');
          navigate(role === 'MUA' ? '/worker/dashboard' : '/');
        }
      } else {
        // Login API: POST /api/v1/auth/login
        const res = await authApi.login({ phone, password });
        if (res && res.data) {
          dispatch(setCredentials({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            userId: res.data.userId,
            roles: res.data.roles,
            user: {
              id: res.data.userId,
              fullName: res.data.fullName,
              phoneNumber: res.data.phone,
              userRole: res.data.roles?.includes('ROLE_MUA') ? 'MUA' : 'CUSTOMER'
            }
          }));
          toast.success('Đăng nhập thành công!');
          navigate(res.data.roles?.includes('ROLE_MUA') ? '/worker/dashboard' : '/');
        }
      }
    } catch (err) {
      toast.error('Thao tác thất bại: ' + (err.response?.data?.message || err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-slate-50">
      {/* Invisible Recaptcha Container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-rose-100 shadow-xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center mx-auto shadow-md shadow-rose-500/20">
            <Sparkles size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isRegisterMode ? 'Đăng Ký Tài Khoản Mới' : 'Đăng Nhập GlowUp MUA'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isRegisterMode ? 'Điền thông tin và xác nhận SĐT qua OTP' : 'Nhập SĐT và mật khẩu để tiếp tục'}
          </p>
        </div>

        {/* Role Selector Tabs (Customer vs MUA) */}
        {isRegisterMode && (
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRole('CUSTOMER')}
              className={`py-2 rounded-xl transition ${role === 'CUSTOMER' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Khách Hàng
            </button>
            <button
              type="button"
              onClick={() => setRole('MUA')}
              className={`py-2 rounded-xl transition ${role === 'MUA' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Thợ Makeup (MUA)
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và Tên:</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Nguyen Van A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Số Điện Thoại:</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-mono font-medium"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email:</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mật Khẩu:</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
          </div>

          {/* OTP Section for Registration */}
          {isRegisterMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Mã Xác Thực OTP:</label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
                >
                  {otpSent ? 'Gửi Lại Mã OTP' : 'Gửi OTP (`POST /send-otp`)'}
                </button>
              </div>
              <input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono tracking-widest focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-rose-600/30 transition transform hover:scale-[1.02]"
          >
            <span>{isRegisterMode ? 'Xác Nhận Đăng Ký' : 'Đăng Nhập Khung Giờ'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-xs text-slate-500 hover:text-slate-900 font-semibold transition"
          >
            {isRegisterMode ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký tại đây'}
          </button>
        </div>

      </div>
    </div>
  );
};
