import axios from 'axios';

// Read ImgBB API key from environment variable or default key
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || 'd4ca913bd400db1bfdf7e49b28369bb5';

/**
 * Helper: Convert a local File object to Base64 Data URL as a reliable offline/fallback storage
 */
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Upload a local image File from user's device directly to ImgBB cloud storage,
 * with automatic Base64 Data URL fallback if the ImgBB key is missing or invalid.
 * 
 * @param {File} imageFile - Local image file object from <input type="file" />
 * @returns {Promise<string>} Direct hosted URL of the uploaded image
 */
export const uploadImageToImgBB = async (imageFile) => {
  if (!imageFile) {
    throw new Error('Vui lòng chọn một tệp hình ảnh');
  }

  // 1. If an API key is provided, attempt ImgBB upload
  if (IMGBB_API_KEY && IMGBB_API_KEY.trim() !== '') {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY.trim()}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data.url || response.data.data.display_url;
      }
    } catch (error) {
      console.warn('[ImgBB Upload Warning]: API Key failed or invalid, switching to local Base64 fallback:', error?.response?.data || error?.message);
    }
  }

  // 2. Fallback: Convert file directly to Base64 Data URL (Works 100% reliably in <img> tags & databases)
  try {
    const base64Url = await readFileAsDataURL(imageFile);
    return base64Url;
  } catch (e) {
    throw new Error('Không thể đọc tệp ảnh từ máy của bạn');
  }
};
