import React, { useState, useEffect } from 'react';
import { Wallet, X, ArrowUpRight, ArrowDownLeft, CreditCard, QrCode, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { toast } from 'sonner';

export default function WalletModal({ isOpen, onClose, userId = '1', userType = 'CUSTOMER', onBalanceUpdated }) {
  const [activeTab, setActiveTab] = useState('TOPUP'); // 'TOPUP' | 'LEDGER' | 'WITHDRAW'
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Top-Up State
  const [topUpAmount, setTopUpAmount] = useState(100000);
  const [momoResult, setMomoResult] = useState(null);

  // Ledger History State
  const [ledgerEntries, setLedgerEntries] = useState([]);

  // Withdrawal State
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(100000);

  // New Bank Account Form
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [newBank, setNewBank] = useState({ bankCode: 'VCB', accountNumber: '', accountName: '' });

  useEffect(() => {
    if (isOpen) {
      fetchWalletBalance();
      fetchLedgerHistory();
      fetchBankAccounts();
    }
  }, [isOpen, userId, userType]);

  const fetchWalletBalance = async () => {
    try {
      const res = await paymentApi.getWalletBalance(userId, userType);
      const data = res.data?.data || res.data || res;
      setBalance(data.balance || 0);
      if (onBalanceUpdated) onBalanceUpdated(data.balance || 0);
    } catch (err) {
      console.warn('Lỗi lấy số dư ví:', err);
    }
  };

  const fetchLedgerHistory = async () => {
    try {
      const res = await paymentApi.getWalletLedger(userId, userType);
      const list = res.data?.data || res.data || [];
      setLedgerEntries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Lỗi lấy sổ cái ví:', err);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await paymentApi.getUserBankAccounts(userId);
      const list = res.data?.data || res.data || [];
      setBankAccounts(Array.isArray(list) ? list : []);
      if (list.length > 0) {
        setSelectedBankId(list[0].id);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách bank:', err);
    }
  };

  const handleInitiateMoMoTopUp = async () => {
    if (!topUpAmount || topUpAmount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }
    setIsLoading(true);
    setMomoResult(null);
    try {
      const res = await paymentApi.initiateMoMoTopUp(userId, topUpAmount);
      const data = res.data?.data || res.data || {};
      setMomoResult(data);
      toast.success('Khởi tạo liên kết nạp tiền MoMo thành công!');
    } catch (err) {
      toast.error('Không thể tạo liên kết MoMo: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    if (!newBank.accountNumber || !newBank.accountName) {
      toast.error('Vui lòng nhập đầy đủ thông tin tài khoản');
      return;
    }
    try {
      await paymentApi.addBankAccount({
        userId,
        bankCode: newBank.bankCode,
        accountNumber: newBank.accountNumber,
        accountName: newBank.accountName.toUpperCase(),
      });
      toast.success('Thêm tài khoản ngân hàng thành công!');
      setShowAddBankForm(false);
      setNewBank({ bankCode: 'VCB', accountNumber: '', accountName: '' });
      fetchBankAccounts();
    } catch (err) {
      toast.error('Thêm tài khoản thất bại');
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!selectedBankId) {
      toast.error('Vui lòng chọn tài khoản ngân hàng nhận tiền');
      return;
    }
    if (withdrawAmount < 50000) {
      toast.error('Số tiền rút tối thiểu là 50.000 VNĐ');
      return;
    }
    if (withdrawAmount > balance) {
      toast.error('Số dư ví không đủ để rút số tiền này');
      return;
    }
    setIsLoading(true);
    try {
      await paymentApi.requestWithdrawal({
        userId,
        userType,
        bankAccountId: selectedBankId,
        amount: withdrawAmount,
      });
      toast.success('Tạo yêu cầu rút tiền thành công! Tiền sẽ về TK trong 24h.');
      fetchWalletBalance();
      fetchLedgerHistory();
    } catch (err) {
      toast.error('Yêu cầu rút tiền thất bại: ' + (err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Widget */}
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition text-white"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-2 opacity-90 text-xs font-bold uppercase tracking-wider">
            <Wallet size={16} /> Ví Điện Tử MakeupApp ({userType === 'WORKER' ? 'Ví Thợ' : 'Ví Khách'})
          </div>
          
          <div className="text-3xl font-black font-mono tracking-tight">
            {balance.toLocaleString('vi-VN')} <span className="text-sm font-bold opacity-80">VNĐ</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('TOPUP')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'TOPUP'
                ? 'bg-white text-rose-600 border-b-2 border-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode size={15} /> Nạp MoMo
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LEDGER'
                ? 'bg-white text-rose-600 border-b-2 border-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={15} /> Sổ Cái Bút Toán
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'WITHDRAW'
                ? 'bg-white text-rose-600 border-b-2 border-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={15} /> Rút Về Ngân Hàng
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: NẠP TIỀN MOMO */}
          {activeTab === 'TOPUP' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 block">Chọn mệnh giá nạp tiền (VNĐ):</span>
              
              <div className="grid grid-cols-4 gap-2">
                {[50000, 100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setTopUpAmount(val)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      topUpAmount === val
                        ? 'bg-rose-50 border-rose-500 text-rose-600'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {(val / 1000).toLocaleString()}k
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Hoặc nhập số tiền tùy chỉnh:</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={handleInitiateMoMoTopUp}
                disabled={isLoading}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-pink-200"
              >
                {isLoading ? 'Đang kết nối MoMo Sandbox...' : 'Tạo Mã QR Nạp Tiền MoMo'}
              </button>

              {momoResult && (
                <div className="bg-pink-50 border border-pink-200 p-4 rounded-2xl space-y-3 text-center animate-fadeIn">
                  <span className="text-xs font-bold text-pink-700 block">Liên Kết Nạp Tiền MoMo Sandbox Trực Tiếp</span>
                  
                  {momoResult.payUrl && (
                    <a
                      href={momoResult.payUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-pink-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-pink-700 transition shadow-sm"
                    >
                      <QrCode size={16} /> Mở Trang Thanh Toán MoMo (PayURL)
                    </a>
                  )}

                  <p className="text-[10px] text-pink-600 font-medium">
                    * Sau khi nạp trên MoMo thành công, MoMo IPN Webhook sẽ tự động cộng số dư vào ví bạn lập tức.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LỊCH SỬ BÚT TOÁN SỔ CÁI (LEDGER) */}
          {activeTab === 'LEDGER' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Nhật Ký Biến Động Số Dư (Append-Only Ledger):</span>
              
              {ledgerEntries.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">Chưa có giao dịch sổ cái nào.</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {ledgerEntries.map((entry) => (
                    <div key={entry.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${entry.entryType === 'CREDIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {entry.entryType === 'CREDIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{entry.description || 'Bút toán tài chính'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{entry.createdAt ? new Date(entry.createdAt).toLocaleString('vi-VN') : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-black ${entry.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {entry.entryType === 'CREDIT' ? '+' : '-'}{entry.amount?.toLocaleString('vi-VN')}đ
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">Dư: {entry.balanceAfter?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RÚT TIỀN VỀ NGÂN HÀNG (PAYOUT) */}
          {activeTab === 'WITHDRAW' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Tài khoản Ngân hàng nhận tiền:</span>
                <button
                  onClick={() => setShowAddBankForm(!showAddBankForm)}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  {showAddBankForm ? 'Hủy' : '+ Thêm Ngân hàng'}
                </button>
              </div>

              {/* Form thêm tài khoản ngân hàng */}
              {showAddBankForm && (
                <form onSubmit={handleAddBankAccount} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ngân hàng:</label>
                    <select
                      value={newBank.bankCode}
                      onChange={(e) => setNewBank({ ...newBank, bankCode: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold"
                    >
                      <option value="VCB">Vietcombank (VCB)</option>
                      <option value="MB">MBBank (MB)</option>
                      <option value="TCB">Techcombank (TCB)</option>
                      <option value="ICB">Vietinbank (ICB)</option>
                      <option value="VPB">VPBank (VPB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Số tài khoản:</label>
                    <input
                      type="text"
                      placeholder="0123456789"
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tên chủ tài khoản (Viết hoa không dấu):</label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={newBank.accountName}
                      onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold uppercase"
                    />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs">
                    Lưu Tài Khoản Ngân Hàng
                  </button>
                </form>
              )}

              {/* Danh sách Ngân hàng đã liên kết */}
              {bankAccounts.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-2 text-amber-800 text-xs font-medium">
                  <AlertCircle size={16} /> Bạn chưa có tài khoản ngân hàng liên kết nào. Hãy bấm "Thêm Ngân hàng" ở trên.
                </div>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((b) => (
                    <label
                      key={b.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                        selectedBankId === b.id
                          ? 'bg-rose-50 border-rose-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="bankSelect"
                          checked={selectedBankId === b.id}
                          onChange={() => setSelectedBankId(b.id)}
                          className="accent-rose-600"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{b.bankCode} - {b.accountNumber}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{b.accountName}</p>
                        </div>
                      </div>
                      {b.isVerified && <CheckCircle2 size={16} className="text-emerald-600" />}
                    </label>
                  ))}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Số tiền muốn rút (Tối thiểu 50.000đ):</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={handleRequestWithdrawal}
                disabled={isLoading || !selectedBankId}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-rose-200"
              >
                {isLoading ? 'Đang tạo lệnh rút tiền...' : 'Yêu Cầu Rút Tiền Về Ngân Hàng'}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
