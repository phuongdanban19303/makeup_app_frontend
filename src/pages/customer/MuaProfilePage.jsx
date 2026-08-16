import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setDraftCheckout } from '../../store/bookingSlice';
import { muaApi } from '../../api/muaApi';
import { RatingStars } from '../../components/common/RatingStars';
import { Modal } from '../../components/common/Modal';
import { 
  CheckCircle2, Sparkles, Clock, Calendar, Image as ImageIcon, 
  ChevronRight, Phone, Award, CheckSquare, Square, Info, DollarSign, ShieldAlert 
} from 'lucide-react';
import { toast } from 'sonner';

export const MuaProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [worker, setWorker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'portfolio'
  const [previewImage, setPreviewImage] = useState(null);

  // Dynamic Options Selection Modal State for Customer
  const [selectedService, setSelectedService] = useState(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await muaApi.getProfile(id || '2');
        const data = res.data || res;
        if (data) {
          setWorker(data);
        }
      } catch (err) {
        toast.error('Không thể tải thông tin hồ sơ thợ: ' + (err.message || ''));
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPortfolios = async () => {
      try {
        const res = await muaApi.getPortfolios(id || '2');
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setWorker((prev) => ({ ...prev, portfolios: data }));
        }
      } catch (err) {
        console.warn('[MuaProfile] Cannot fetch worker portfolios:', err.message);
      }
    };

    fetchProfile();
    fetchPortfolios();
  }, [id]);

  // Open Service Option Customizer Modal
  const handleOpenCustomizeModal = (service) => {
    setSelectedService(service);
    
    // Default selected options: All COMPONENTS are checked by default
    const opts = service.options || [
      { id: '1', optionType: 'COMPONENT', optionName: 'Đánh Kem Nền', price: 100000, isDefault: true, isRemovable: true },
      { id: '2', optionType: 'COMPONENT', optionName: 'Che Khuyết Điểm', price: 100000, isDefault: true, isRemovable: false },
      { id: '3', optionType: 'COMPONENT', optionName: 'Phấn Phủ Kiềm Dầu', price: 100000, isDefault: true, isRemovable: true },
      { id: '4', optionType: 'ADD_ON', optionName: 'Làm Tóc Cô Dâu', price: 200000, isDefault: false, isRemovable: true },
    ];

    const defaultCheckedIds = opts
      .filter((o) => o.isDefault || o.optionType === 'COMPONENT')
      .map((o) => String(o.id || o.optionName));

    setSelectedOptionIds(defaultCheckedIds);
  };

  // Toggle option checkbox
  const handleToggleOption = (opt) => {
    const optId = String(opt.id || opt.optionName);
    
    // If not removable, block unchecking
    if (opt.isRemovable === false && selectedOptionIds.includes(optId)) {
      toast.warning(`Bước [${opt.optionName}] là thành phần bắt buộc trong gói, không thể bỏ tick!`);
      return;
    }

    if (selectedOptionIds.includes(optId)) {
      setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optId));
    } else {
      setSelectedOptionIds([...selectedOptionIds, optId]);
    }
  };

  // Calculate Real-time Pricing for Customer
  const serviceOptions = selectedService?.options || [
    { id: '1', optionType: 'COMPONENT', optionName: 'Đánh Kem Nền', price: 100000, isDefault: true, isRemovable: true },
    { id: '2', optionType: 'COMPONENT', optionName: 'Che Khuyết Điểm', price: 100000, isDefault: true, isRemovable: false },
    { id: '3', optionType: 'COMPONENT', optionName: 'Phấn Phủ Kiềm Dầu', price: 100000, isDefault: true, isRemovable: true },
    { id: '4', optionType: 'ADD_ON', optionName: 'Làm Tóc Cô Dâu', price: 200000, isDefault: false, isRemovable: true },
  ];

  const basePackageFee = selectedService?.basePrice || selectedService?.price || 200000;
  const activeSelectedOptions = serviceOptions.filter((o) =>
    selectedOptionIds.includes(String(o.id || o.optionName))
  );

  const optionsFee = activeSelectedOptions.reduce((sum, o) => sum + (o.price || 0), 0);
  const finalPackagePrice = basePackageFee + optionsFee;

  // Confirm Selection and Proceed to Checkout
  const handleConfirmAndCheckout = () => {
    if (!worker || !selectedService) return;

    dispatch(
      setDraftCheckout({
        worker,
        service: {
          ...selectedService,
          price: finalPackagePrice,
          basePackageFee,
          optionsFee,
          packageSubtotal: finalPackagePrice,
          selectedOptions: activeSelectedOptions,
        },
        scheduledTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        note: '',
      })
    );

    toast.success(`Đã tùy chỉnh gói [${selectedService.serviceName}] - ${finalPackagePrice.toLocaleString('vi-VN')}đ`);
    setSelectedService(null);
    navigate('/booking/checkout');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500">
        <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-sm font-semibold">Đang tải hồ sơ Thợ Makeup...</p>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      
      {/* Banner / Header Card */}
      <section className="relative pt-8 pb-12 bg-gradient-to-b from-rose-100/70 via-pink-50/40 to-slate-50 border-b border-rose-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar & Online status */}
            <div className="relative flex-shrink-0">
              <img
                src={worker.avatar || worker.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={worker.fullName}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-rose-300/60 shadow-xl"
              />
              <span
                className={`absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white border-2 border-white shadow ${
                  worker.currentStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              >
                {worker.currentStatus === 'ONLINE' ? '🟢 ONLINE' : '⚪ OFFLINE'}
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{worker.fullName}</h1>
                <span className="bg-rose-100 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 size={12} className="text-rose-600" /> Thợ Xác Thực
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600">
                <RatingStars rating={worker.rating || 4.9} totalReviews={worker.totalCompletedJobs || 45} size={18} />
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 font-bold text-slate-800">
                  <Award size={14} className="text-amber-500" /> {worker.totalCompletedJobs || 45} ca hoàn thành
                </span>
              </div>

              <p className="text-xs text-slate-700 max-w-2xl leading-relaxed pt-1 font-medium">
                {worker.bio || 'Chuyên gia trang điểm cô dâu & sự kiện 5 năm kinh nghiệm'}
              </p>

              {/* Address tag */}
              {worker.address && (
                <p className="text-xs text-slate-500 pt-1 font-medium">📍 Khu vực hoạt động: {worker.address}</p>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Main Tabs Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'services'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar size={16} /> Danh Sách Gói Dịch Vụ ({worker.services?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'portfolio'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ImageIcon size={16} /> Bộ Sưu Tập Portfolio ({worker.portfolios?.length || 0})
          </button>
        </div>

        {/* Tab 1: Services List */}
        {activeTab === 'services' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {worker.services?.map((service) => {
              const sId = service.id || service.serviceId;
              const opts = service.options || [];
              const defaultComponentsPrice = opts
                .filter((o) => o.optionType === 'COMPONENT' && o.isDefault)
                .reduce((sum, o) => sum + (o.price || 0), 0);
              const defaultPriceDisplay = (service.basePrice || service.price || 0) + defaultComponentsPrice;

              return (
                <div
                  key={sId}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:border-rose-300 transition group flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 rounded mb-1">
                          {service.category || 'MAKEUP BUNDLE'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-rose-600 transition">
                          {service.serviceName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Giá mặc định:</span>
                        <span className="text-base font-black text-rose-600 font-mono">
                          {defaultPriceDisplay.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5 font-semibold">
                      <Clock size={14} /> <span>Ước tính: {service.estimatedDurationMinutes || service.durationMinutes || 60} phút</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-indigo-600 font-bold flex items-center gap-1">
                      <Sparkles size={13} /> Lắp ghép options linh hoạt
                    </span>
                    <button
                      onClick={() => handleOpenCustomizeModal(service)}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-600/25 transition transform hover:scale-105"
                    >
                      <span>Tùy Chọn & Đặt Lịch</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Portfolio Gallery */}
        {activeTab === 'portfolio' && (
          <div className="mt-6">
            {!worker.portfolios || worker.portfolios.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs shadow-sm">
                Chưa có ảnh trong bộ sưu tập portfolio
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {worker.portfolios.map((img) => (
                  <div
                    key={img.portfolioId}
                    onClick={() => setPreviewImage(img)}
                    className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border border-slate-200 hover:border-rose-400 transition shadow-sm"
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.caption || 'Portfolio'}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex items-end">
                      <p className="text-xs text-white font-medium line-clamp-2">{img.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal: Real-time Customer Options Customizer & Dynamic Pricing */}
      <Modal
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={`✨ TÙY CHỈNH GÓI DỊCH VỤ: ${selectedService?.serviceName || ''}`}
      >
        {selectedService && (
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
            
            {/* Core Base Labor Fee Card */}
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                  Cốt lõi dịch vụ (Bắt buộc)
                </span>
                <h4 className="font-bold text-slate-900 text-xs">Tiền công Thợ trang điểm tại nhà</h4>
              </div>
              <span className="text-sm font-black text-amber-900 font-mono">
                {basePackageFee.toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* Components Checkboxes (Các bước mặc định) */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={14} /> Các Bước Mặc Định Trong Gói (Components):
              </h4>

              <div className="space-y-2">
                {serviceOptions
                  .filter((o) => o.optionType === 'COMPONENT')
                  .map((opt) => {
                    const optId = String(opt.id || opt.optionName);
                    const isChecked = selectedOptionIds.includes(optId);
                    const isRequired = opt.isRemovable === false;

                    return (
                      <div
                        key={optId}
                        onClick={() => handleToggleOption(opt)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
                          isRequired
                            ? 'bg-slate-100 border-slate-200 opacity-90 cursor-not-allowed'
                            : isChecked
                            ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRequired}
                            onChange={() => handleToggleOption(opt)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {opt.optionName}
                              {isRequired && (
                                <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                                  Bắt buộc
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-black font-mono text-slate-800">
                          +{opt.price?.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Add-ons Checkboxes (Dịch vụ bán kèm) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Square size={14} /> Dịch Vụ Mua Thêm (Add-ons):
              </h4>

              <div className="space-y-2">
                {serviceOptions
                  .filter((o) => o.optionType === 'ADD_ON')
                  .map((opt) => {
                    const optId = String(opt.id || opt.optionName);
                    const isChecked = selectedOptionIds.includes(optId);

                    return (
                      <div
                        key={optId}
                        onClick={() => handleToggleOption(opt)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-amber-50 border-amber-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleOption(opt)}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-bold text-slate-900">{opt.optionName}</span>
                        </div>

                        <span className="text-xs font-black font-mono text-amber-900">
                          +{opt.price?.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Dynamic Real-time Total Calculation Box */}
            <div className="bg-slate-900 p-4 rounded-2xl text-white space-y-2 shadow-lg">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Tiền công cơ bản + Phụ phí options chọn:</span>
                <span className="font-mono">{basePackageFee.toLocaleString('vi-VN')}đ + {optionsFee.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">TỔNG TIỀN GÓI DỊCH VỤ:</span>
                  <span className="text-xs text-emerald-400 italic font-medium">Cập nhật tức thì thời gian thực</span>
                </div>
                <span className="text-2xl font-black text-rose-400 font-mono">
                  {finalPackagePrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmAndCheckout}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition transform hover:scale-[1.01]"
            >
              <CheckCircle2 size={18} />
              <span>Xác Nhận Tùy Chỉnh & Chuyển Sang Thanh Toán</span>
            </button>

          </div>
        )}
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.caption || 'Hình ảnh Portfolio'}
      >
        {previewImage && (
          <div className="space-y-3">
            <img src={previewImage.imageUrl} alt="Portfolio" className="w-full rounded-xl max-h-[70vh] object-contain" />
            {previewImage.caption && (
              <p className="text-xs text-slate-700 text-center font-medium italic">{previewImage.caption}</p>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};
