import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { switchRole } from '../../store/authSlice';
import { Compass, Briefcase, Activity, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedRole, isAuthenticated, roles } = useSelector((state) => state.auth);
  const { activeBooking } = useSelector((state) => state.booking);

  const isActive = (path) => location.pathname === path;

  // Available roles allowed for current logged-in user
  const userAllowedRoles = isAuthenticated 
    ? (roles && roles.length > 0 ? roles : [selectedRole]) 
    : ['ROLE_CUSTOMER'];

  const handleRoleToggle = () => {
    if (userAllowedRoles.length <= 1) return;
    const currentIndex = userAllowedRoles.indexOf(selectedRole);
    const nextRole = userAllowedRoles[(currentIndex + 1) % userAllowedRoles.length];
    dispatch(switchRole(nextRole));
    toast.info(`Đã đổi chế độ sang: ${nextRole}`);
    if (nextRole === 'ROLE_CUSTOMER') navigate('/');
    else if (nextRole === 'ROLE_MUA') navigate('/worker/dashboard');
    else navigate('/admin/dashboard');
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-rose-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-2">
      <div className="flex items-center justify-around">
        
        {/* Customer Home / Search */}
        {selectedRole === 'ROLE_CUSTOMER' && (
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
              isActive('/') ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Compass size={20} className={isActive('/') ? 'text-rose-600 animate-pulse' : ''} />
            <span className="text-[10px]">Tìm Thợ</span>
          </Link>
        )}

        {/* MUA Workbench */}
        {selectedRole === 'ROLE_MUA' && (
          <Link
            to="/worker/dashboard"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
              isActive('/worker/dashboard') ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Briefcase size={20} className={isActive('/worker/dashboard') ? 'text-indigo-600' : ''} />
            <span className="text-[10px]">Nhận Ca</span>
          </Link>
        )}

        {/* Admin Dashboard */}
        {selectedRole === 'ROLE_ADMIN' && (
          <Link
            to="/admin/dashboard"
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
              isActive('/admin/dashboard') ? 'text-amber-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <ShieldCheck size={20} className={isActive('/admin/dashboard') ? 'text-amber-600' : ''} />
            <span className="text-[10px]">Quản Trị</span>
          </Link>
        )}

        {/* Active Order Tracking (If any) */}
        {activeBooking && activeBooking.status !== 'COMPLETED' && activeBooking.status !== 'CANCELLED' && (
          <Link
            to={
              selectedRole === 'ROLE_MUA'
                ? `/worker/job/${activeBooking.bookingId || activeBooking.id}`
                : `/booking/track/${activeBooking.bookingId || activeBooking.id}`
            }
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition ${
              isActive(
                selectedRole === 'ROLE_MUA'
                  ? `/worker/job/${activeBooking.bookingId || activeBooking.id}`
                  : `/booking/track/${activeBooking.bookingId || activeBooking.id}`
              ) ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            <div className="relative">
              <Activity size={20} className="text-rose-600 animate-bounce" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            </div>
            <span className="text-[10px] text-rose-600 font-bold">Theo Dõi</span>
          </Link>
        )}

        {/* Account / Role Display */}
        <button
          onClick={handleRoleToggle}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-slate-500 font-medium hover:text-slate-900"
        >
          <User size={20} />
          <span className="text-[10px] uppercase font-bold text-rose-600">{selectedRole.replace('ROLE_', '')}</span>
        </button>

      </div>
    </nav>
  );
};
