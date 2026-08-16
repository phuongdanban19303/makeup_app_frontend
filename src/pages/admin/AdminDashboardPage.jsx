import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { bookingApi } from '../../api/bookingApi';
import { updateBookingStatus } from '../../store/bookingSlice';
import { ShieldCheck, Filter, RefreshCw, AlertCircle, Edit, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const AdminDashboardPage = () => {
  const dispatch = useDispatch();
  const { bookingHistory } = useSelector((state) => state.booking);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [overrideStatus, setOverrideStatus] = useState('COMPLETED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOverrideStatus = async (bookingId) => {
    setIsSubmitting(true);
    try {
      await bookingApi.overrideStatus(bookingId, overrideStatus);
      dispatch(updateBookingStatus(overrideStatus));
      toast.success(`[Admin Override] Đã đổi trạng thái đơn ${bookingId} ➔ ${overrideStatus}`);
    } catch (err) {
      toast.error('Không thể override trạng thái: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBookings = bookingHistory.filter((b) =>
    filterStatus === 'ALL' ? true : b.status === filterStatus
  );

  return (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <ShieldCheck size={26} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Quản Trị Viên Dashboard (ROLE_ADMIN)</h1>
              <p className="text-xs text-slate-500 font-medium">Giám sát đơn hàng toàn hệ thống & Đổi trạng thái Override</p>
            </div>
          </div>

          {/* Filter Status Badge */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-2 rounded-2xl text-xs">
            <Filter size={14} className="text-amber-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-white">Tất cả trạng thái</option>
              <option value="MATCHING" className="bg-white">MATCHING (Đang chờ thợ)</option>
              <option value="ACCEPTED" className="bg-white">ACCEPTED (Thợ đã nhận)</option>
              <option value="MUA_MOVING" className="bg-white">MUA_MOVING (Thợ di chuyển)</option>
              <option value="ARRIVED" className="bg-white">ARRIVED (Thợ đã đến)</option>
              <option value="MAKING_UP" className="bg-white">MAKING_UP (Đang làm)</option>
              <option value="COMPLETED" className="bg-white">COMPLETED (Hoàn thành)</option>
              <option value="CANCELLED" className="bg-white">CANCELLED (Đã hủy)</option>
            </select>
          </div>
        </div>

        {/* Global Bookings Table Specification */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh Sách Đơn Hàng Hệ Thống ({filteredBookings.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="p-3.5">Mã Đơn (Booking ID)</th>
                  <th className="p-3.5">Dịch Vụ & Thợ</th>
                  <th className="p-3.5">Địa Chỉ Khách Hàng</th>
                  <th className="p-3.5">Tổng Tiền</th>
                  <th className="p-3.5">Trạng Thái Hiện Tại</th>
                  <th className="p-3.5 text-right">Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredBookings.map((b) => (
                  <tr key={b.bookingId} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono text-rose-600 font-bold">{b.bookingId}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{b.serviceName || 'Makeup Cô Dâu'}</p>
                      <p className="text-[11px] text-slate-500">Thợ: {b.muaName || 'Trần Nhã Phương'}</p>
                    </td>
                    <td className="p-3.5 max-w-xs truncate">{b.customerAddress}</td>
                    <td className="p-3.5 font-mono text-emerald-600 font-bold">{b.totalPrice?.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        b.status === 'CANCELLED' ? 'bg-slate-100 text-slate-500' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={overrideStatus}
                          onChange={(e) => setOverrideStatus(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] rounded-lg px-2 py-1 focus:outline-none font-bold"
                        >
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="MAKING_UP">MAKING_UP</option>
                        </select>
                        <button
                          onClick={() => handleOverrideStatus(b.bookingId)}
                          disabled={isSubmitting}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition shadow-sm"
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
