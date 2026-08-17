import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { switchRole, logout, updateUser } from '../../store/authSlice';
import { Sparkles, MapPin, User, LogOut, ShieldCheck, Compass, Calendar, Briefcase, Activity, Camera, Upload } from 'lucide-react';
import { uploadImageToImgBB } from '../../utils/imageUploadService';
import { authApi } from '../../api/authApi';
import { toast } from 'sonner';

export const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user, selectedRole, roles } = useSelector((state) => state.auth);
  const { address } = useSelector((state) => state.location);
  const { activeBooking } = useSelector((state) => state.booking);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const avatarInputRef = useRef(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Đang tải ảnh đại diện lên ImgBB...');
    setIsUploadingAvatar(true);
    try {
      const imageUrl = await uploadImageToImgBB(file);
      await authApi.updateAvatar(imageUrl);
      dispatch(updateUser({ avatarUrl: imageUrl, avatar: imageUrl }));
      toast.success('Đã cập nhật ảnh đại diện mới vào cơ sở dữ liệu!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Lỗi tải ảnh đại diện', { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRoleChange = (role) => {
    dispatch(switchRole(role));
    toast.success(`Đã chuyển sang giao diện: ${
      role === 'ROLE_CUSTOMER' ? 'Khách Hàng' : role === 'ROLE_MUA' ? 'Thợ Makeup (MUA)' : 'Quản Trị Viên'
    }`);
    if (role === 'ROLE_CUSTOMER') navigate('/');
    else if (role === 'ROLE_MUA') navigate('/worker/dashboard');
    else if (role === 'ROLE_ADMIN') navigate('/admin/dashboard');
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.info('Đã đăng xuất tài khoản');
    navigate('/auth');
  };

  const logoDestination = selectedRole === 'ROLE_MUA' 
    ? '/worker/dashboard' 
    : selectedRole === 'ROLE_ADMIN' 
    ? '/admin/dashboard' 
    : '/';

  // Available roles allowed for current logged-in user
  const userAllowedRoles = isAuthenticated 
    ? (roles && roles.length > 0 ? roles : [selectedRole]) 
    : ['ROLE_CUSTOMER'];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-rose-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to={logoDestination} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 bg-clip-text text-transparent tracking-tight">
                GlowUp MUA
              </span>
              <span className="block text-[10px] text-rose-500/80 font-bold -mt-1 tracking-widest uppercase">
                Makeup On-Demand
              </span>
            </div>
          </Link>

          {/* Customer Current Address Bar */}
          {selectedRole === 'ROLE_CUSTOMER' && (
            <div className="hidden md:flex items-center gap-2 bg-rose-50/80 border border-rose-200/70 px-3.5 py-1.5 rounded-full text-xs text-slate-700 hover:border-rose-400 transition cursor-pointer shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
              <span className="truncate max-w-[240px] font-medium" title={address}>
                {address}
              </span>
            </div>
          )}
        </div>

        {/* Role Switcher Pill Bar */}
        <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80 text-xs">
          {userAllowedRoles.includes('ROLE_CUSTOMER') && (
            <button
              onClick={() => handleRoleChange('ROLE_CUSTOMER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold transition ${
                selectedRole === 'ROLE_CUSTOMER'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <Compass size={14} />
              <span className="hidden sm:inline">Khách Hàng</span>
            </button>
          )}

          {userAllowedRoles.includes('ROLE_MUA') && (
            <button
              onClick={() => handleRoleChange('ROLE_MUA')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold transition ${
                selectedRole === 'ROLE_MUA'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              <Briefcase size={14} />
              <span className="hidden sm:inline">Thợ MUA</span>
            </button>
          )}

          {userAllowedRoles.includes('ROLE_ADMIN') && (
            <button
              onClick={() => handleRoleChange('ROLE_ADMIN')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold transition ${
                selectedRole === 'ROLE_ADMIN'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Quản Trị</span>
            </button>
          )}
        </div>

        {/* Navigation Actions & User Menu */}
        <div className="flex items-center gap-3">
          
          {/* Active Booking Banner Notification */}
          {activeBooking && activeBooking.status !== 'COMPLETED' && activeBooking.status !== 'CANCELLED' && (
            <Link
              to={
                selectedRole === 'ROLE_MUA'
                  ? `/worker/job/${activeBooking.bookingId || activeBooking.id}`
                  : `/booking/track/${activeBooking.bookingId || activeBooking.id}`
              }
              className="hidden lg:flex items-center gap-2 bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-rose-200 transition animate-pulse"
            >
              <Activity size={14} className="text-rose-600" />
              <span>Ca makeup: <strong>{activeBooking.status}</strong></span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-slate-100 border border-slate-200 hover:border-rose-400 p-1.5 pr-3 rounded-full transition shadow-sm"
              >
                <img
                  src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-rose-500/50"
                />
                <span className="text-xs font-bold text-slate-800 hidden sm:inline">
                  {user?.fullName || 'Tài khoản'}
                </span>
              </button>

              {/* Hidden File Input for Avatar Upload */}
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-rose-100 shadow-xl p-2 z-50 animate-fadeIn"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1 flex items-center gap-3">
                    <div 
                      className="relative group cursor-pointer shrink-0" 
                      onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                      title="Đổi ảnh đại diện"
                    >
                      <img
                        src={user?.avatarUrl || user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
                        alt="Avatar"
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-rose-500/60 shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName || 'Tài khoản'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email || user?.phoneNumber}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                        className="mt-1 text-[10px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                      >
                        <Upload size={10} /> {isUploadingAvatar ? 'Đang tải...' : 'Tải ảnh đại diện'}
                      </button>
                    </div>
                  </div>

                  {selectedRole === 'ROLE_CUSTOMER' && (
                    <Link
                      to="/"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl font-medium transition"
                    >
                      <Compass size={14} /> Tìm thợ gần đây
                    </Link>
                  )}

                  {selectedRole === 'ROLE_MUA' && (
                    <>
                      <Link
                        to="/worker/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl font-medium transition"
                      >
                        <Briefcase size={14} /> Bảng công việc MUA
                      </Link>
                      <Link
                        to="/worker/services"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl font-medium transition"
                      >
                        <Calendar size={14} /> Quản lý Dịch vụ & Ảnh
                      </Link>
                    </>
                  )}

                  {selectedRole === 'ROLE_ADMIN' && (
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl font-medium transition"
                    >
                      <ShieldCheck size={14} /> Quản lý đơn hệ thống
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition mt-1 border-t border-slate-100"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-rose-600/25 transition"
            >
              Đăng nhập / Đăng ký
            </Link>
          )}

        </div>
      </div>
    </header>
  );
};
