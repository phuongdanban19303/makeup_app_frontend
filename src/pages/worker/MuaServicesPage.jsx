import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { muaApi } from '../../api/muaApi';
import { Modal } from '../../components/common/Modal';
import { 
  Calendar, Plus, Image as ImageIcon, Trash2, Clock, DollarSign, 
  Upload, CheckCircle2, Edit3, Power, AlertTriangle, Layers, 
  Sparkles, CheckSquare, Square, Eye, RefreshCw, X 
} from 'lucide-react';
import { uploadImageToImgBB } from '../../utils/imageUploadService';
import { toast } from 'sonner';

// Standard Master Categories & Services Suggestions
const MASTER_CATEGORIES = [
  { id: 1, name: 'Makeup Cô Dâu (BRIDAL)', category: 'BRIDAL' },
  { id: 2, name: 'Makeup Đi Tiệc (EVENT)', category: 'EVENT' },
  { id: 3, name: 'Trang Điểm Tự Nhiên / Kỷ Yếu (BASIC)', category: 'BASIC' },
  { id: 4, name: 'Combo Makeup & Làm Tóc (COMBO)', category: 'COMBO' },
];

const COMPONENT_SUGGESTIONS = [
  { name: 'Đánh Kem Nền', price: 100000, isRemovable: true },
  { name: 'Che Khuyết Điểm', price: 100000, isRemovable: false },
  { name: 'Phấn Phủ Kiềm Dầu', price: 100000, isRemovable: true },
  { name: 'Son Môi Cao Cấp', price: 50000, isRemovable: true },
  { name: 'Kẻ Mắt & Mi Giả Tự Nhiên', price: 80000, isRemovable: true },
];

const ADDON_SUGGESTIONS = [
  { name: 'Làm Tóc Cô Dâu', price: 200000 },
  { name: 'Dán Mi 3D Premium', price: 100000 },
  { name: 'Ủ Da Dưỡng Ẩm Chuyên Sâu', price: 150000 },
  { name: 'Trang Điểm Cho Mẹ Cô Dâu', price: 500000 },
];

export const MuaServicesPage = () => {
  const { currentWorkerProfile, user } = useSelector((state) => state.worker);
  const { user: authUser } = useSelector((state) => state.auth);
  const workerId = authUser?.id || user?.id || currentWorkerProfile?.userId || currentWorkerProfile?.id || null;


  const [services, setServices] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Bundle Form States
  const [selectedMasterId, setSelectedMasterId] = useState(1);
  const [category, setCategory] = useState('BRIDAL');
  const [serviceName, setServiceName] = useState('');
  const [basePrice, setBasePrice] = useState(200000);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(90);
  const [description, setDescription] = useState('');

  // Options State: array of { id, optionType, optionName, price, isDefault, isRemovable }
  const [options, setOptions] = useState([
    { id: 'opt-1', optionType: 'COMPONENT', optionName: 'Đánh Kem Nền', price: 100000, isDefault: true, isRemovable: true },
    { id: 'opt-2', optionType: 'COMPONENT', optionName: 'Che Khuyết Điểm', price: 100000, isDefault: true, isRemovable: false },
    { id: 'opt-3', optionType: 'COMPONENT', optionName: 'Phấn Phủ', price: 100000, isDefault: true, isRemovable: true },
    { id: 'opt-4', optionType: 'ADD_ON', optionName: 'Làm Tóc Cô Dâu', price: 200000, isDefault: false, isRemovable: true },
  ]);

  // Portfolio Form State
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [rawFile, setRawFile] = useState(null);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const handlePortfolioFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);

    const toastId = toast.loading('Đang tải ảnh Portfolio lên ImgBB...');
    setIsUploadingPortfolio(true);
    try {
      const url = await uploadImageToImgBB(file);
      setPreviewUrl(url);
      toast.success('Đã tải ảnh lên ImgBB thành công!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Lỗi tải ảnh', { id: toastId });
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId) => {
    try {
      await muaApi.deletePortfolio(workerId, portfolioId);
      setPortfolios((prev) => prev.filter((p) => (p.portfolioId || p.id) !== portfolioId));
      toast.success('Đã xóa ảnh khỏi bộ sưu tập!');
    } catch (err) {
      setPortfolios((prev) => prev.filter((p) => (p.portfolioId || p.id) !== portfolioId));
      toast.success('Đã xóa ảnh khỏi giao diện');
    }
  };

  // 1. Load Services list from API (GET /api/v1/mua/{muaId}/services?includeInactive=true)
  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await muaApi.getServices(workerId, true);
      const data = res.data || res;
      if (Array.isArray(data)) {
        setServices(data);
      } else if (currentWorkerProfile?.services) {
        setServices(currentWorkerProfile.services);
      }
    } catch (err) {
      console.warn('[MuaServices] Dùng fallback dịch vụ:', err.message);
      if (currentWorkerProfile?.services) {
        setServices(currentWorkerProfile.services);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Portfolio list from API (GET /api/v1/mua/{muaId}/portfolio)
  const fetchPortfolios = async () => {
    try {
      const res = await muaApi.getPortfolios(workerId);
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setPortfolios(data);
      }
    } catch (err) {
      console.warn('[MuaServices] Cannot fetch portfolios from API:', err.message);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchPortfolios();
  }, [workerId]);

  // Calculate Real-time Provider Default Preview Price
  const componentsPriceSum = options
    .filter((o) => o.optionType === 'COMPONENT' && o.isDefault)
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const defaultPreviewPrice = (Number(basePrice) || 0) + componentsPriceSum;

  // Open Form to Create
  const handleOpenCreateModal = () => {
    setEditingServiceId(null);
    setSelectedMasterId(1);
    setCategory('BRIDAL');
    setServiceName('Gói Makeup Cô Dâu Cao Cấp');
    setBasePrice(200000);
    setEstimatedDurationMinutes(90);
    setDescription('Sử dụng mỹ phẩm cao cấp MAC, Dior, Chanel...');
    setOptions([
      { id: 'opt-1', optionType: 'COMPONENT', optionName: 'Đánh Kem Nền', price: 100000, isDefault: true, isRemovable: true },
      { id: 'opt-2', optionType: 'COMPONENT', optionName: 'Che Khuyết Điểm', price: 100000, isDefault: true, isRemovable: false },
      { id: 'opt-3', optionType: 'COMPONENT', optionName: 'Phấn Phủ', price: 100000, isDefault: true, isRemovable: true },
      { id: 'opt-4', optionType: 'ADD_ON', optionName: 'Làm Tóc Cô Dâu', price: 200000, isDefault: false, isRemovable: true },
    ]);
    setIsBundleModalOpen(true);
  };

  // Open Form to Edit
  const handleOpenEditModal = (service) => {
    setEditingServiceId(service.id || service.serviceId);
    setCategory(service.category || 'BRIDAL');
    setServiceName(service.serviceName || '');
    setBasePrice(service.basePrice || service.price || 200000);
    setEstimatedDurationMinutes(service.estimatedDurationMinutes || service.durationMinutes || 60);
    setDescription(service.description || '');

    if (service.options && Array.isArray(service.options)) {
      setOptions(service.options.map((o, idx) => ({ ...o, id: o.id || `opt-edit-${idx}` })));
    } else {
      setOptions([
        { id: 'opt-1', optionType: 'COMPONENT', optionName: 'Đánh Kem Nền', price: 100000, isDefault: true, isRemovable: true },
        { id: 'opt-2', optionType: 'COMPONENT', optionName: 'Che Khuyết Điểm', price: 100000, isDefault: true, isRemovable: false },
      ]);
    }
    setIsBundleModalOpen(true);
  };

  // Option Builder Actions
  const handleAddComponent = (suggestItem) => {
    const item = suggestItem || { name: 'Bước mới', price: 50000, isRemovable: true };
    setOptions((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}-${Math.random()}`,
        optionType: 'COMPONENT',
        optionName: item.name,
        price: item.price,
        isDefault: true,
        isRemovable: item.isRemovable !== false,
      },
    ]);
  };

  const handleAddAddon = (suggestItem) => {
    const item = suggestItem || { name: 'Dịch vụ thêm', price: 150000 };
    setOptions((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}-${Math.random()}`,
        optionType: 'ADD_ON',
        optionName: item.name,
        price: item.price,
        isDefault: false,
        isRemovable: true,
      },
    ]);
  };

  const handleUpdateOption = (id, field, value) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const handleRemoveOption = (id) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  // Save / Update Service Bundle
  const handleSubmitBundle = async (e) => {
    e.preventDefault();
    if (!serviceName || !basePrice) {
      toast.error('Vui lòng điền tên gói và tiền công cốt lõi');
      return;
    }

    const payload = {
      masterServiceId: selectedMasterId,
      category,
      serviceName,
      basePrice: parseFloat(basePrice),
      estimatedDurationMinutes: parseInt(estimatedDurationMinutes, 10),
      description,
      options: options.map(({ id, ...rest }) => ({
        ...rest,
        price: parseFloat(rest.price) || 0,
      })),
    };

    try {
      if (editingServiceId) {
        // PUT /api/v1/mua/{muaId}/services/{serviceId}
        await muaApi.updateService(workerId, editingServiceId, payload);
        toast.success('Đã cập nhật gói dịch vụ thành công!');
      } else {
        // POST /api/v1/mua/{muaId}/bundle-services
        await muaApi.createBundleService(workerId, payload);
        toast.success('Đã tạo mới gói dịch vụ lắp ghép động thành công!');
      }

      setIsBundleModalOpen(false);
      fetchServices();
    } catch (err) {
      toast.error('Lưu gói dịch vụ thất bại: ' + (err.message || ''));
    }
  };

  // Toggle Active Status (PATCH /api/v1/mua/{muaId}/services/{serviceId}/toggle-status?isActive=...)
  const handleToggleStatus = async (service) => {
    const sId = service.id || service.serviceId;
    const nextStatus = !service.isActive;
    try {
      await muaApi.toggleServiceStatus(workerId, sId, nextStatus);
      toast.success(`Đã ${nextStatus ? 'bật lại' : 'tạm ẩn'} gói [${service.serviceName}]`);
      setServices((prev) =>
        prev.map((s) => ((s.id || s.serviceId) === sId ? { ...s, isActive: nextStatus } : s))
      );
    } catch (err) {
      toast.error('Lỗi đổi trạng thái gói: ' + (err.message || ''));
    }
  };

  // Permanent Hard Delete (DELETE /api/v1/mua/{muaId}/services/{serviceId}?permanent=true)
  const handleHardDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await muaApi.deleteService(workerId, deleteConfirmId, true);
      toast.success('Đã xóa vĩnh viễn gói dịch vụ khỏi hệ thống!');
      setServices((prev) => prev.filter((s) => (s.id || s.serviceId) !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error('Không thể xóa dịch vụ: ' + (err.message || ''));
    }
  };

  // Portfolio Submit
  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('caption', caption || 'Tác phẩm mới');
      if (previewUrl) {
        formData.append('url', previewUrl);
        formData.append('imageUrl', previewUrl);
      }
      if (rawFile) {
        formData.append('file', rawFile);
      }

      const res = await muaApi.addPortfolio(workerId, formData);
      const savedData = res?.data || res;
      setPortfolios([
        ...portfolios,
        {
          portfolioId: savedData.portfolioId || savedData.id || Date.now(),
          imageUrl: savedData.imageUrl || previewUrl || 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=600',
          caption: savedData.caption || caption || 'Tác phẩm mới',
        },
      ]);
      toast.success('Đã lưu ảnh Portfolio vào cơ sở dữ liệu!');
      setIsAddPortfolioOpen(false);
      setCaption('');
      setPreviewUrl('');
      setRawFile(null);
    } catch (err) {
      toast.error('Lỗi lưu ảnh: ' + (err.message || ''));
    }
  };

  return (
    <div className="min-h-screen py-8 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Workbench */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Quản Lý Gói Dịch Vụ Lắp Ghép Động (Dynamic Bundles)</h1>
              <button onClick={fetchServices} className="p-1 text-slate-400 hover:text-indigo-600">
                <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-600' : ''} />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium pt-0.5">
              Phân cấp 3 Tầng: Master Service ➔ Base Service (Tiền công) ➔ Options (Components & Add-ons)
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg shadow-rose-600/30 transition transform hover:scale-105"
          >
            <Plus size={16} />
            <span>+ Tạo Gói Dịch Vụ Mới (Dynamic Bundle)</span>
          </button>
        </div>

        {/* Dynamic Service Bundles List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Layers size={16} className="text-rose-600" /> Danh Sách Gói Dịch Vụ Hiện Có ({services.length})
            </h2>
          </div>

          {services.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3 text-slate-400 text-xs shadow-sm">
              <Layers size={32} className="mx-auto text-slate-300" />
              <p>Chưa có gói dịch vụ nào. Hãy bấm <strong>"+ Tạo Gói Dịch Vụ Mới"</strong> để thiết lập bảng giá lắp ghép động.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((s) => {
                const sId = s.id || s.serviceId;
                const components = s.options?.filter((o) => o.optionType === 'COMPONENT') || [];
                const addOns = s.options?.filter((o) => o.optionType === 'ADD_ON') || [];
                const bPrice = s.basePrice || s.price || 0;
                const calcDefaultTotal = bPrice + components.filter(c => c.isDefault).reduce((a, b) => a + (b.price || 0), 0);

                return (
                  <div
                    key={sId}
                    className={`bg-white rounded-3xl border p-6 space-y-4 shadow-sm transition ${
                      s.isActive !== false
                        ? 'border-slate-200 hover:border-rose-300'
                        : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    {/* Package Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md mb-1">
                          {s.category || 'BRIDAL'}
                        </span>
                        <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                          {s.serviceName}
                          {s.isActive === false && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">
                              TẠM ẨN
                            </span>
                          )}
                        </h3>
                      </div>

                      {/* Display Default Total Price */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Giá Mặc Định:</span>
                        <span className="text-lg font-black text-rose-600 font-mono">
                          {calcDefaultTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">{s.description}</p>

                    {/* Breakdown & Options */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>Tiền công cốt lõi (Base):</span>
                        <span className="font-mono text-slate-900">{bPrice.toLocaleString('vi-VN')}đ</span>
                      </div>

                      {/* Components */}
                      {components.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                            Các bước mặc định (Components):
                          </span>
                          {components.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                              <span className="flex items-center gap-1">
                                <CheckSquare size={12} className="text-emerald-500" /> {c.optionName}
                                {c.isRemovable ? (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">Có thể bỏ</span>
                                ) : (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded font-bold">Bắt buộc</span>
                                )}
                              </span>
                              <span className="font-mono text-slate-800">+{c.price?.toLocaleString('vi-VN')}đ</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add-ons */}
                      {addOns.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                            Dịch vụ bán kèm (Add-ons):
                          </span>
                          {addOns.map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                              <span className="flex items-center gap-1">
                                <Square size={12} className="text-amber-500" /> {a.optionName}
                              </span>
                              <span className="font-mono text-slate-800">+{a.price?.toLocaleString('vi-VN')}đ</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Action Controls: Toggle Status, Edit, Hard Delete */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {/* Toggle Active Switch */}
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          s.isActive !== false
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <Power size={13} />
                        <span>{s.isActive !== false ? '🟢 Đang hiện (Bật)' : '⚪ Tạm ẩn (Tắt)'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="flex items-center gap-1 p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition text-xs font-bold"
                          title="Chỉnh sửa gói"
                        >
                          <Edit3 size={15} /> Sửa
                        </button>

                        {/* Hard Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmId(sId)}
                          className="flex items-center gap-1 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs font-bold"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 size={15} /> Xóa
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Portfolio Gallery Section */}
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={16} className="text-purple-600" /> Ảnh Bộ Sưu Tập Portfolio ({portfolios.length})
            </h2>
            <button
              onClick={() => setIsAddPortfolioOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
            >
              <Upload size={14} /> Upload Ảnh Mới
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {portfolios.map((p) => (
              <div key={p.portfolioId || p.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={p.imageUrl || p.url} alt={p.caption} className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-between">
                  <button
                    type="button"
                    onClick={() => handleDeletePortfolio(p.portfolioId || p.id)}
                    className="self-end bg-rose-600 hover:bg-rose-500 text-white p-1.5 rounded-full shadow transition"
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={12} />
                  </button>
                  <p className="text-xs text-white font-medium line-clamp-2">{p.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Modal: Dynamic Bundle Setup & Option Builder */}
      <Modal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        title={editingServiceId ? '✏️ CHỈNH SỬA GÓI DỊCH VỤ LẮP GHÉP' : '➕ THIẾT LẬP GÓI DỊCH VỤ LẮP GHÉP ĐỘNG (BUNDLE)'}
      >
        <form onSubmit={handleSubmitBundle} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
          
          {/* Tầng 1: Master Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tầng 1: Chọn Danh Mục Chuẩn:</label>
              <select
                value={selectedMasterId}
                onChange={(e) => {
                  const mId = Number(e.target.value);
                  setSelectedMasterId(mId);
                  const selectedCat = MASTER_CATEGORIES.find(c => c.id === mId);
                  if (selectedCat) setCategory(selectedCat.category);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-bold"
              >
                {MASTER_CATEGORIES.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên Gói Dịch Vụ Hiển Thị:</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Gói Makeup Cô Dâu Tiệc Đêm Cao Cấp..."
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-bold"
              />
            </div>
          </div>

          {/* Base Labor Price & Duration */}
          <div className="grid grid-cols-2 gap-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">
                Tầng 2: Tiền Công Cốt Lõi (Base Price):
              </label>
              <input
                type="number"
                required
                placeholder="200000"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono font-black"
              />
              <span className="text-[10px] text-amber-700 block mt-1">Phí cố định không thể bỏ tick</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thời Gian Thực Hiện (Phút):</label>
              <input
                type="number"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô Tả Gói Dịch Vụ:</label>
            <textarea
              rows={2}
              placeholder="Mô tả mỹ phẩm sử dụng, cam kết chất lượng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Tầng 3: OPTIONS BUILDER */}
          <div className="space-y-4 border-t border-slate-200 pt-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Tầng 3: Thiết Lập Các Bước & Options</span>
            </h4>

            {/* Section 3.1: Components (Mặc định) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                  <CheckSquare size={14} /> Các bước mặc định (COMPONENTS):
                </span>
                <button
                  type="button"
                  onClick={() => handleAddComponent()}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Thêm bước mới
                </button>
              </div>

              {/* Suggestions chips for Components */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold self-center pr-1">Gợi ý nhanh:</span>
                {COMPONENT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddComponent(s)}
                    className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition"
                  >
                    + {s.name} ({s.price / 1000}k)
                  </button>
                ))}
              </div>

              {/* Components List Inputs */}
              <div className="space-y-2">
                {options
                  .filter((o) => o.optionType === 'COMPONENT')
                  .map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Tên bước (VD: Đánh Kem Nền)"
                        value={opt.optionName}
                        onChange={(e) => handleUpdateOption(opt.id, 'optionName', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      />
                      <div className="w-28 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-400">đ</span>
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => handleUpdateOption(opt.id, 'price', e.target.value)}
                          className="w-full font-mono text-xs font-bold focus:outline-none"
                        />
                      </div>

                      {/* IsRemovable toggle */}
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={opt.isRemovable}
                          onChange={(e) => handleUpdateOption(opt.id, 'isRemovable', e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Cho bỏ tick</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Section 3.2: Add-ons (Bán thêm) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  <Square size={14} /> Dịch vụ bán kèm (ADD-ONS):
                </span>
                <button
                  type="button"
                  onClick={() => handleAddAddon()}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Thêm add-on mới
                </button>
              </div>

              {/* Suggestions chips for Add-ons */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold self-center pr-1">Gợi ý bán kèm:</span>
                {ADDON_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddAddon(s)}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 transition"
                  >
                    + {s.name} ({s.price / 1000}k)
                  </button>
                ))}
              </div>

              {/* Add-ons List Inputs */}
              <div className="space-y-2">
                {options
                  .filter((o) => o.optionType === 'ADD_ON')
                  .map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/80">
                      <input
                        type="text"
                        placeholder="Tên add-on (VD: Làm Tóc Cô Dâu)"
                        value={opt.optionName}
                        onChange={(e) => handleUpdateOption(opt.id, 'optionName', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                      />
                      <div className="w-28 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-400">đ</span>
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => handleUpdateOption(opt.id, 'price', e.target.value)}
                          className="w-full font-mono text-xs font-bold focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

          </div>

          {/* Section 3.3: REAL-TIME PROVIDER FORM PREVIEW BOX */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-4 rounded-2xl text-white space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-400" /> Xem Trước Gợi Ý Bảng Giá Cho Khách
              </span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded font-mono">
                REAL-TIME PREVIEW
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span>• Tiền công cốt lõi:</span>
                <span>{(Number(basePrice) || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between">
                <span>• Các bước mặc định:</span>
                <span>+{componentsPriceSum.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold">👉 Tổng giá gói hiển thị mặc định:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {defaultPreviewPrice.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition transform hover:scale-[1.01]"
          >
            {editingServiceId ? 'Cập Nhật Gói Dịch Vụ (`PUT`)' : 'Lưu Gói Dịch Vụ Lắp Ghép Động (`POST`)'}
          </button>

        </form>
      </Modal>

      {/* Modal Confirmation for Hard Delete */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="⚠️ XÁC NHẬN XÓA VĨNH VIỄN GÓI DỊCH VỤ"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Bạn có chắc chắn muốn xóa gói dịch vụ này khỏi hệ thống không?
            <br />
            <strong className="text-rose-600">Lưu ý: Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn dữ liệu khỏi Database.</strong>
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleHardDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-rose-600/30"
            >
              Xác Nhận Xóa Vĩnh Viễn
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Add Portfolio */}
      <Modal isOpen={isAddPortfolioOpen} onClose={() => setIsAddPortfolioOpen(false)} title="UPLOAD ẢNH PORTFOLIO SẢN PHẨM">
        <form onSubmit={handleAddPortfolio} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tải Ảnh Từ Thiết Bị (ImgBB Cloud):</label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handlePortfolioFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
              />
              {isUploadingPortfolio && (
                <p className="text-xs text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw size={12} className="animate-spin text-indigo-600" /> Đang tải ảnh trực tiếp từ máy lên ImgBB...
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hoặc Nhập URL Ảnh Direct (Tùy chọn):</label>
            <input
              type="text"
              placeholder="https://i.ibb.co/..."
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {previewUrl && (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
              <img src={previewUrl} alt="Preview Portfolio" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chú Thích Ảnh (Caption):</label>
            <input
              type="text"
              placeholder="Makeup tone Tây quyến rũ cho khách tiệc cưới..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={isUploadingPortfolio || !previewUrl}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
          >
            <Upload size={14} /> Lưu Vào Bộ Sưu Tập Portfolio
          </button>
        </form>
      </Modal>

    </div>
  );
};

