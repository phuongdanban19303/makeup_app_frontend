import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export const VnpayCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const responseCode = searchParams.get('vnp_ResponseCode') || '99';
  const txnRef = searchParams.get('vnp_TxnRef') || '';
  const amountStr = searchParams.get('vnp_Amount') || '0';
  const amount = Number(amountStr) / 100;

  const isSuccess = responseCode === '00';

  useEffect(() => {
    if (isSuccess) {
      toast.success('🎉 Nạp tiền VNPay thành công! Số dư ví của bạn đã được cập nhật.');
    } else {
      toast.error('❌ Thanh toán VNPay thất bại hoặc bị hủy.');
    }
  }, [isSuccess]);

  return (
    <div className="min-h-screen py-16 bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 text-center space-y-6">
        
        {isSuccess ? (
          <div className="bg-white p-8 rounded-3xl border border-emerald-200 shadow-xl space-y-4 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={48} className="animate-bounce" />
            </div>

            <h2 className="text-xl font-black text-slate-900">Xác Nhận Nạp Tiền Thành Công!</h2>
            <p className="text-xs text-slate-500 font-medium">Cổng VNPay Sandbox đã ghi nhận giao dịch của bạn.</p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Mã giao dịch VNPay:</span>
                <span className="font-mono font-bold text-slate-900 truncate max-w-[180px]">{txnRef || 'VNPAY_TOPUP_SUCCESS'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Số tiền nạp:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">+{amount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Trạng thái VNPay:</span>
                <span className="font-bold text-emerald-600">THÀNH CÔNG (code 00)</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition transform hover:scale-[1.01]"
            >
              <Wallet size={16} />
              <span>Quay Về Màn Hình Chính & Đặt Lịch</span>
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-xl space-y-4 animate-fadeIn">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <XCircle size={48} />
            </div>

            <h2 className="text-xl font-black text-slate-900">Giao Dịch VNPay Thất Bại Hoặc Bị Hủy</h2>
            <p className="text-xs text-rose-600 font-medium">Mã phản hồi từ VNPay: {responseCode}</p>

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl shadow transition"
            >
              <ArrowLeft size={16} />
              <span>Quay Về Trang Chủ</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
