import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RatingStars } from '../common/RatingStars';
import { MapPin, CheckCircle2, ChevronRight, Sparkles, Clock } from 'lucide-react';

export const WorkerCard = ({ worker = {}, isSelected, onSelect }) => {
  const navigate = useNavigate();

  const handleBookNow = (e) => {
    e.stopPropagation();
    navigate(`/mua/${worker.muaId || worker.workerId}`);
  };

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
  const fullName = worker.fullName || worker.muaName || (worker.workerId ? `Chuyên Gia MUA #${worker.workerId}` : 'Chuyên Gia MUA');
  const avatar = worker.avatar || worker.avatarUrl || DEFAULT_AVATAR;
  const bio = worker.bio || 'Chuyên gia trang điểm tận nơi chuyên nghiệp với hơn 5 năm kinh nghiệm.';

  const rating = typeof worker.rating === 'number' ? worker.rating : 5.0;
  const totalReviews = worker.totalReviews || 0;
  const distanceKm = typeof worker.distanceKm === 'number' ? worker.distanceKm : (worker.distanceKm || 0);

  return (
    <div
      onClick={onSelect}
      className={`relative group rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'bg-white border-2 border-rose-500 shadow-xl shadow-rose-500/10 scale-[1.01]'
          : 'bg-white border border-slate-200/90 hover:border-rose-400 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        
        {/* Avatar with Status Badge */}
        <div className="relative flex-shrink-0">
          <img
            src={avatar}
            alt={fullName}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_AVATAR;
            }}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 group-hover:ring-rose-400 transition"
          />
          <span
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
              worker.currentStatus === 'ONLINE' ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'
            }`}
            title={`Trạng thái: ${worker.currentStatus || 'OFFLINE'}`}
          >
            {worker.currentStatus === 'ONLINE' && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            )}
          </span>
        </div>

        {/* Worker Info Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <h4 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition truncate">
                {fullName}
              </h4>
              {worker.isVerified && (
                <CheckCircle2 size={16} className="text-rose-500 fill-rose-100 flex-shrink-0" title="Thợ đã xác thực" />
              )}
            </div>

            {/* Distance Highlight Badge */}
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 shadow-sm">
              <MapPin size={12} className="text-rose-500" />
              <span>Cách {distanceKm} km</span>
            </div>
          </div>

          {/* Rating & Completed Jobs */}
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <RatingStars rating={rating} totalReviews={totalReviews} />
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 flex items-center gap-1 font-medium">
              <Sparkles size={12} className="text-amber-500" /> {worker.totalCompletedJobs || 0} ca thành công
            </span>
          </div>

          {/* Bio Preview */}
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {bio}
          </p>

          {/* Services Quick Pill Tags */}
          {worker.services && worker.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {worker.services.slice(0, 2).map((s, idx) => {
                const servicePrice = Number(s.defaultTotalPrice ?? s.basePrice ?? s.price ?? 0);
                return (
                  <span key={s.id || s.serviceId || idx} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{s.serviceName}</span>
                    <span className="text-rose-600 font-bold">{servicePrice.toLocaleString('vi-VN')}đ</span>
                  </span>
                );
              })}
              {worker.services.length > 2 && (
                <span className="text-[10px] text-slate-400 px-1 font-mono">+{worker.services.length - 2}</span>
              )}
            </div>
          )}


          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Clock size={12} /> {worker.currentStatus === 'ONLINE' ? 'Sẵn sàng phục vụ' : 'Đang bận ca'}
            </span>
            <button
              onClick={handleBookNow}
              className="flex items-center gap-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md shadow-rose-600/20 transition group-hover:translate-x-0.5"
            >
              <span>Xem Hồ sơ & Đặt lịch</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
