import { axiosInstance } from './axiosInstance';

export const paymentApi = {
  // Lấy số dư ví của tài khoản hiện tại
  getMyBalance: (userType = 'CUSTOMER') =>
    axiosInstance.get(`/api/v1/wallets/me/balance?userType=${userType}`),

  // Lấy số dư ví của userId cụ thể
  getWalletBalance: (userId, userType = 'CUSTOMER') =>
    axiosInstance.get(`/api/v1/wallets/user/${userId}/balance?userType=${userType}`),

  // Lấy nhật ký biến động số dư Sổ cái kế toán (Ledger Entries)
  getWalletLedger: (userId, userType = 'CUSTOMER') =>
    axiosInstance.get(`/api/v1/wallets/user/${userId}/ledger?userType=${userType}`),

  // Khởi tạo yêu cầu nạp tiền MoMo (nhận payUrl & qrCodeUrl)
  initiateMoMoTopUp: (customerId, amount) =>
    axiosInstance.post('/api/v1/wallets/top-up/momo', { customerId, amount, paymentMethod: 'MOMO' }),

  // Tạm giữ tiền (Escrow Hold)
  escrowHold: (payload) =>
    axiosInstance.post('/api/v1/wallets/escrow/hold', payload),

  // Giải phóng tiền (Escrow Release)
  escrowRelease: (payload) =>
    axiosInstance.post('/api/v1/wallets/escrow/release', payload),

  // Hoàn tiền (Escrow Refund)
  escrowRefund: (payload) =>
    axiosInstance.post('/api/v1/wallets/escrow/refund', payload),

  // Thêm tài khoản ngân hàng liên kết
  addBankAccount: (payload) =>
    axiosInstance.post('/api/v1/wallets/bank-accounts', payload),

  // Lấy danh sách ngân hàng liên kết của user
  getUserBankAccounts: (userId) =>
    axiosInstance.get(`/api/v1/wallets/bank-accounts/user/${userId}`),

  // Yêu cầu rút tiền Payout về ngân hàng
  requestWithdrawal: (payload) =>
    axiosInstance.post('/api/v1/wallets/withdraw', payload),
};
