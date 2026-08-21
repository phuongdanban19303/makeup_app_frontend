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

  const handleInitiateVnpayTopUp = async () => {
    if (!topUpAmount || topUpAmount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10.000 VNĐ');
      return;
    }
    setIsLoading(true);
    try {
      const res = await paymentApi.initiateVnpayTopUp(userId, topUpAmount);
      const data = res.data?.data || res.data || {};
      const paymentUrl = data.paymentUrl || data;

      if (paymentUrl && typeof paymentUrl === 'string') {
        toast.success('Đang chuyển sang Cổng thanh toán VNPay Sandbox...');
        window.location.href = paymentUrl;
      } else {
        toast.error('Lỗi cổng VNPay: Không thể tạo link thanh toán');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Không thể kết nối cổng VNPay';
      toast.error('Lỗi cổng VNPay: ' + errMsg);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Widget */}
        <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-6 text-white relative">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onClose) onClose();
            }}
            className="absolute top-4 right-4 z-30 bg-white/20 hover:bg-white/30 hover:scale-110 p-2.5 rounded-full transition-all text-white cursor-pointer flex items-center justify-center shadow-md active:scale-95"
            aria-label="Đóng"
          >
            <X size={20} />
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
            <CreditCard size={15} /> Nạp VNPay Sandbox
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LEDGER'
                ? 'bg-white text-rose-600 border-b-2 border-rose-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode size={15} /> Sổ Cái Bút Toán
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
          
          {/* TAB 1: NẠP TIỀN VNPAY */}
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

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-[11px] text-blue-800 font-medium">
                💳 Thẻ test VNPay NCB: <strong>970419852619143219</strong> | Chủ thẻ: <strong>NGUYEN VAN A</strong> | OTP: <strong>123456</strong>
              </div>

              <button
                onClick={handleInitiateVnpayTopUp}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-3.5 rounded-xl transition shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard size={16} />
                <span>{isLoading ? 'Đang khởi tạo VNPay...' : 'Nạp Tiền Qua VNPay Sandbox'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ BÚT TOÁN (LEDGER) */}
          {activeTab === 'LEDGER' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Lịch sử biến động sổ cái (Ledger History):</span>
              
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
