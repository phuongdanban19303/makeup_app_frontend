# ĐẶC TẢ API & MÔ TẢ GIAO DIỆN FRONTEND DỰ ÁN MAKEUP APP (MONOREPO)

Tài liệu đặc tả toàn bộ API, luồng dữ liệu, dữ liệu Request/Response chuẩn hóa và bản đồ tích hợp màn hình Frontend cho hệ thống **Makeup On-Demand Platform**.

---

## I. KIẾN TRÚC HỆ THỐNG & ĐỊNH DẠNG CHUẨN

- **Base URL API Gateway**: `http://localhost:8080`
- **Xác thực (Authentication)**: Gửi Header `Authorization: Bearer <accessToken>` cho tất cả các API ngoại trừ public endpoints (`/api/v1/auth/**`).
- **Phân quyền Role**: 
  - `ROLE_CUSTOMER`: Tính năng dành cho Khách hàng.
  - `ROLE_MUA`: Tính năng dành cho Thợ Makeup.
  - `ROLE_ADMIN`: Quyền quản trị tối cao.

### Structural Response Envelope (`ApiResponse<T>`)
Mọi API trong hệ thống đều trả về cấu trúc chuẩn JSON như sau:

```json
{
  "success": true,
  "status": 200,
  "code": "SUCCESS",
  "message": "Thông báo kết quả thành công hoặc lỗi",
  "data": { ... },
  "timestamp": "2026-08-12T12:00:00Z",
  "path": "/api/v1/...",
  "trace_id": "d8f4e2a1-7c9b-4b1a-8e2d-3f5a1c9b2e4f"
}
```

---

## II. DANH SÁCH CHI TIẾT CÁC API THEO NGIỆM VỤ

---

### 1. DỊCH VỤ XÁC THỰC & NGƯỜI DÙNG (`user-service`)

#### 1.1. Gửi mã OTP xác thực SĐT
- **Method & URL**: `POST /api/v1/auth/send-otp`
- **Auth**: Public (Không cần Token)
- **Request Body**:
```json
{
  "phone": "0901234567"
}
```
- **Response Data (`data`)**:
```json
{
  "phone": "0901234567",
  "otp": "123456"
}
```

#### 1.2. Đăng ký tài khoản (Khách hàng hoặc Thợ MUA)
- **Method & URL**: `POST /api/v1/auth/register`
- **Auth**: Public
- **Request Body**:
```json
{
  "phone": "0901234567",
  "email": "user@example.com",
  "fullName": "Nguyen Van A",
  "password": "Password123!",
  "otpCode": "123456",
  "role": "CUSTOMER" // Hoặc "MUA"
}
```
- **Response Data (`data`)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni...",
  "tokenType": "Bearer",
  "expiresInMs": 86400000,
  "userId": 105,
  "phone": "0901234567",
  "fullName": "Nguyen Van A",
  "roles": ["ROLE_CUSTOMER"]
}
```

#### 1.3. Đăng nhập
- **Method & URL**: `POST /api/v1/auth/login`
- **Auth**: Public
- **Request Body**:
```json
{
  "phone": "0901234567",
  "password": "Password123!"
}
```
- **Response Data (`data`)**: Trả về thông tin cặp Token tương tự API Register.

#### 1.4. Lấy thông tin cá nhân của người dùng hiện tại
- **Method & URL**: `GET /api/v1/users/me`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`, `ROLE_MUA`, `ROLE_ADMIN`)
- **Response Data (`data`)**:
```json
{
  "id": "105",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "email": "user@example.com",
  "userRole": "CUSTOMER",
  "status": "ACTIVE"
}
```

#### 1.5. Xem chi tiết Hồ sơ Thợ Makeup (Full Profile)
- **Method & URL**: `GET /api/v1/mua/{muaId}/profile`
- **Auth**: Public / Customer / MUA
- **Response Data (`data`)**:
```json
{
  "muaId": 200,
  "bio": "Chuyên gia trang điểm cô dâu & sự kiện 5 năm kinh nghiệm",
  "isVerified": true,
  "rating": 4.9,
  "totalReviews": 128,
  "totalCompletedJobs": 240,
  "currentStatus": "ONLINE",
  "services": [
    {
      "serviceId": 1,
      "serviceName": "Makeup Cô Dâu Tiệc Đêm",
      "description": "Bao gồm làm tóc và trang điểm phong cách Hàn Quốc",
      "price": 1500000.0,
      "durationMinutes": 90
    }
  ],
  "portfolios": [
    {
      "portfolioId": 10,
      "imageUrl": "https://cdn.makeupapp.com/portfolio/img1.jpg",
      "caption": "Makeup cô dâu phong cách Glowy"
    }
  ]
}
```

#### 1.6. Cập nhật hồ sơ Thợ Makeup (Bio, Trạng thái)
- **Method & URL**: `PUT /api/v1/mua/{muaId}/profile`
- **Auth**: Bearer Token (`ROLE_MUA`, `ROLE_ADMIN`)
- **Request Body**:
```json
{
  "bio": "Chuyên gia trang điểm cô dâu cao cấp",
  "currentStatus": "ONLINE" // ONLINE hoặc OFFLINE
}
```

#### 1.7. Thêm mới Dịch vụ Makeup của Thợ
- **Method & URL**: `POST /api/v1/mua/{muaId}/services`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Request Body**:
```json
{
  "serviceName": "Makeup Tiệc Nhẹ",
  "description": "Trang điểm tự nhiên đi tiệc sinh nhật, sự kiện",
  "price": 500000.0,
  "durationMinutes": 45
}
```

#### 1.8. Thêm ảnh Portfolio công trình đã làm
- **Method & URL**: `POST /api/v1/mua/{muaId}/portfolio` (Multipart Form Data)
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Request Params**: `file` (Binary Image), `caption` (Text - Optional)

---

### 2. DỊCH VỤ ĐỊNH VỊ & BẢN ĐỒ (`location-service`)

#### 2.1. Tìm kiếm danh sách Thợ gần nhất xung quanh vị trí Khách hàng
- **Method & URL**: `GET /api/v1/workers/nearby`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`, `ROLE_ADMIN`)
- **Query Params**:
  - `latitude`: 10.776889 (Vĩ độ khách)
  - `longitude`: 106.700806 (Kinh độ khách)
  - `radiusKm`: 5.0 (Bán kính tìm kiếm - mặc định 5.0km)
- **Response Data (`data`)**:
```json
[
  {
    "workerId": 200,
    "latitude": 10.778000,
    "longitude": 106.701500,
    "distanceKm": 0.45,
    "status": "ONLINE"
  }
]
```

#### 2.2. Thợ push Stream vị trí GPS thời gian thực (REST Fallback)
- **Method & URL**: `POST /api/v1/location/stream`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Request Body**:
```json
{
  "latitude": 10.778000,
  "longitude": 106.701500,
  "bookingId": "bk-uuid-12345",
  "timestamp": 1770870000000
}
```

---

### 3. DỊCH VỤ TÍNH GIÁ (`pricing-service`)

#### 3.1. Tính toán tổng chi phí dịch vụ & Phí di chuyển
- **Method & URL**: `POST /api/v1/pricing/calculate`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`, `ROLE_MUA`)
- **Request Body**:
```json
{
  "basePrice": 1500000.0,
  "distanceKm": 4.5,
  "surgeMultiplier": 1.0,
  "voucherDiscount": 50000.0
}
```
- **Response Data (`data`)**:
```json
{
  "basePrice": 1500000.0,
  "distanceFee": 45000.0,
  "surgeFee": 0.0,
  "discountAmount": 50000.0,
  "finalPrice": 1495000.0
}
```

---

### 4. DỊCH VỤ ĐẶT LỊCH & VÒNG ĐỜI ĐƠN HÀNG (`booking-service`)

#### 4.1. Khách hàng tạo yêu cầu đặt ca trang điểm (Request & Matching)
- **Method & URL**: `POST /api/v1/bookings/request`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`)
- **Request Body**:
```json
{
  "serviceId": 1,
  "muaId": 200, // Optional: Nếu chỉ định thợ cụ thể
  "customerLatitude": 10.776889,
  "customerLongitude": 106.700806,
  "customerAddress": "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM",
  "scheduledTime": "2026-08-15T18:00:00Z",
  "totalPrice": 1495000.0,
  "note": "Trang điểm tone cam đào nhẹ nhàng"
}
```
- **Response Data (`data`)**:
```json
{
  "bookingId": "bk-uuid-8899-1234",
  "customerId": 105,
  "muaId": 200,
  "status": "MATCHING", // Trạng thái ban đầu: Đang chờ Thợ nhận ca
  "totalPrice": 1495000.0,
  "customerAddress": "720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM",
  "createdAt": "2026-08-12T10:00:00Z"
}
```

#### 4.2. Thợ Makeup chấp nhận ca (Accept Booking)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/accept`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Status đổi thành `ACCEPTED`.

#### 4.3. Thợ Makeup từ chối ca (Reject Booking)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/reject`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Chuyển trạng thái sang tìm thợ tiếp theo hoặc hủy.

#### 4.4. Thợ bấm "Bắt đầu di chuyển" (Start Moving)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/start-moving`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Status đổi thành `MUA_MOVING`.

#### 4.5. Thợ bấm "Đã đến nhà khách" (Arrived)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/arrived`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Status đổi thành `ARRIVED`.

#### 4.6. Thợ bấm "Bắt đầu làm đẹp" (Start Makeup)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/start-makeup`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Status đổi thành `MAKING_UP`.

#### 4.7. Thợ bấm "Hoàn thành ca" (Complete)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/complete`
- **Auth**: Bearer Token (`ROLE_MUA`)
- **Response Data (`data`)**: Status đổi thành `COMPLETED`.

#### 4.8. Hủy đơn đặt lịch (Cancel Booking)
- **Method & URL**: `POST /api/v1/bookings/{bookingId}/cancel`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`, `ROLE_MUA`)
- **Query Params**: `reason` (Lý do hủy đơn - Optional)
- **Response Data (`data`)**: Status đổi thành `CANCELLED`.

---

### 5. DỊCH VỤ THANH TOÁN & VÍ TIỀN (`payment-service`)

#### 5.1. Xem số dư ví tiền hiện tại của tôi
- **Method & URL**: `GET /api/v1/wallets/me/balance`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`, `ROLE_MUA`)
- **Response Data (`data`)**:
```json
{
  "userId": "105",
  "balance": 2500000.0,
  "currency": "VND"
}
```

#### 5.2. Thanh toán đơn hàng
- **Method & URL**: `POST /api/v1/payments/process`
- **Auth**: Bearer Token (`ROLE_CUSTOMER`)
- **Request Body**:
```json
{
  "bookingId": "bk-uuid-8899-1234",
  "amount": 1495000.0,
  "paymentMethod": "E_WALLET" // E_WALLET, CASH, VNPAY
}
```
- **Response Data (`data`)**:
```json
{
  "transactionId": "tx-9988-5544",
  "bookingId": "bk-uuid-8899-1234",
  "customerId": "105",
  "amount": 1495000.0,
  "paymentMethod": "E_WALLET",
  "status": "SUCCESS",
  "timestamp": 1770871200000
}
```

---

## III. MÔ TẢ CÁC MÀN HÌNH GIAO DIỆN FRONTEND (UI SCREEN SPECIFICATIONS)

Dựa trên tập API ở trên, dưới đây là bản mô tả danh sách các màn hình giao diện cần xây dựng cho Frontend (Mobile App Flutter/React Native hoặc Web Application Next.js):

---

### 📱 NHÓM MÀN HÌNH KHÁCH HÀNG (CUSTOMER APP)

#### Màn hình C1: Đăng nhập & Đăng ký (Auth Screen)
- **UI Elements**: Input SĐT, Password, Mã OTP, Selector chọn Vai trò (`Khách hàng` / `Thợ Makeup`).
- **APIs**:
  - Nút "Gửi OTP": `POST /api/v1/auth/send-otp`
  - Nút "Đăng ký": `POST /api/v1/auth/register`
  - Nút "Đăng nhập": `POST /api/v1/auth/login`
- **State**: Lưu `accessToken`, `refreshToken`, `userId`, `roles` vào Storage.

#### Màn hình C2: Trang chủ & Tìm kiếm Thợ gần đây (Home Screen & Nearby Map)
- **UI Elements**: 
  - Bản đồ Google Maps hiển thị vị trí của Khách hàng và các Marker biểu tượng Thợ Makeup xung quanh.
  - Thanh chọn bán kính tìm kiếm (1km, 3km, 5km, 10km).
  - Danh sách Card thông tin Thợ lân cận (Ảnh đại diện, Tên, Đánh giá Star, Khoảng cách km).
- **APIs**: `GET /api/v1/workers/nearby?latitude=...&longitude=...&radiusKm=5.0`

#### Màn hình C3: Chi tiết Hồ sơ Thợ Makeup (MUA Profile Detail)
- **UI Elements**: Banner Bio, Đánh giá Sao, Số đơn đã hoàn thành, Tab Danh sách Dịch vụ (Tên, Giá tiền, Thời gian) & Tab Bộ sưu tập Portfolio (Lưới ảnh sản phẩm trang điểm).
- **APIs**: `GET /api/v1/mua/{muaId}/profile`

#### Màn hình C4: Đặt lịch & Xác nhận Thanh toán (Booking & Payment Checkout)
- **UI Elements**: 
  - Địa chỉ nhận trang điểm (GPS/Text).
  - Ngày & Giờ hẹn làm.
  - Bảng tính giá tiền: Giá gốc + Phí di chuyển - Voucher = Tổng thanh toán.
  - Chọn phương thức thanh toán (Ví điện tử / Tiền mặt).
  - Nút "Xác nhận Đặt lịch".
- **APIs**: 
  - Tính giá: `POST /api/v1/pricing/calculate`
  - Tạo đơn: `POST /api/v1/bookings/request`
  - Thanh toán: `POST /api/v1/payments/process`

#### Màn hình C5: Theo dõi Đơn hàng thời gian thực (Order Live Tracking)
- **UI Elements**:
  - Tiến trình trạng thái (Timeline Stepper): `Đang tìm Thợ` ➔ `Thợ đã nhận` ➔ `Thợ đang di chuyển` ➔ `Thợ đã đến` ➔ `Đang trang điểm` ➔ `Hoàn thành`.
  - Bản đồ theo dõi xe Thợ đang di chuyển đến nhà.
  - Nút "Hủy đơn" (nếu có sự cố).
- **APIs**:
  - Lấy trạng thái đơn: `GET /api/v1/bookings/{id}`
  - Hủy đơn: `POST /api/v1/bookings/{id}/cancel`

---

### 💄 NHÓM MÀN HÌNH THỢ MAKEUP (MUA WORKER APP)

#### Màn hình M1: Bảng điều khiển công việc & Trạng thái (MUA Workbench)
- **UI Elements**:
  - Switch Toggle "Bật/Tắt Nhận Ca" (`ONLINE` / `OFFLINE`).
  - Popup Nhận Ca khẩn cấp khi có Khách hàng đặt đơn gần đó (Đếm ngược 30 giây).
  - Nút "Chấp nhận" / "Từ chối".
- **APIs**:
  - Đổi trạng thái: `PUT /api/v1/mua/{muaId}/profile`
  - Chấp nhận ca: `POST /api/v1/bookings/{id}/accept`
  - Từ chối ca: `POST /api/v1/bookings/{id}/reject`

#### Màn hình M2: Quản lý Vòng đời Ca làm việc (Active Job Lifecycle)
- **UI Elements**:
  - Địa chỉ & SĐT khách hàng.
  - Nút bấm lớn chuyển trạng thái theo thứ tự:
    1. Click `"Bắt đầu di chuyển"` (POST `/start-moving`)
    2. Click `"Đã đến nhà khách"` (POST `/arrived`)
    3. Click `"Bắt đầu Trang điểm"` (POST `/start-makeup`)
    4. Click `"Hoàn thành Ca"` (POST `/complete`)
  - Luồng Stream GPS vị trí ngầm: `POST /api/v1/location/stream`

#### Màn hình M3: Quản lý Dịch vụ & Portfolio (MUA Service & Portfolio Management)
- **UI Elements**:
  - Danh sách bảng giá dịch vụ của Thợ (Form Thêm/Sửa/Xóa dịch vụ).
  - Lưới ảnh Portfolio (Upload ảnh thành quả trang điểm từ Thư viện/Camera).
- **APIs**:
  - Thêm dịch vụ: `POST /api/v1/mua/{muaId}/services`
  - Up ảnh Portfolio: `POST /api/v1/mua/{muaId}/portfolio`

---

### 🛡️ NHÓM MÀN HÌNH QUẢN TRỊ VIÊN (ADMIN DASHBOARD)

#### Màn hình A1: Quản lý Đơn hàng & Override trạng thái
- **UI Elements**: Danh sách toàn bộ đơn hàng trong hệ thống, bộ lọc theo trạng thái, nút Override đổi trạng thái đơn khi xử lý tranh chấp.
- **APIs**: `PUT /api/v1/bookings/{bookingId}/status`
