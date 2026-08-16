import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { MapPin, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';

export const DispatchModal = ({ isOpen, request, onAccept, onReject }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(30);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onReject]);

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onReject} title="🚨 CA ĐẶT LỊCH MỚI CẦN XÁC NHẬN">
      <div className="space-y-4">
        
        {/* Countdown Progress Bar */}
        <div className="flex items-center justify-between text-xs font-bold mb-1">
          <span className="text-amber-400">Thời gian phản hồi ca:</span>
          <span className="text-rose-400 font-mono text-sm">{timeLeft}s</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 30) * 100}%` }}
          />
        </div>

        {/* Customer & Job Info */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white text-base">{request.serviceName}</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              +{request.totalPrice?.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-300">
            <MapPin size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{request.customerAddress}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock size={14} className="text-amber-400 flex-shrink-0" />
            <span>Hẹn làm lúc: {new Date(request.scheduledTime || Date.now()).toLocaleString('vi-VN')}</span>
          </div>

          {request.note && (
            <div className="text-xs bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300 italic">
              "{request.note}"
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition"
          >
            <XCircle size={18} /> Từ chối
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition transform hover:scale-[1.02]"
          >
            <CheckCircle size={18} /> Chấp Nhận Ca
          </button>
        </div>

      </div>
    </Modal>
  );
};
