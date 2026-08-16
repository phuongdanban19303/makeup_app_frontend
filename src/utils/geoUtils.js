/**
 * Utility function to convert GPS coordinates (latitude, longitude)
 * to a human-readable street address using OpenStreetMap Nominatim API (Free, no API key needed).
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return 'Vị trí chưa xác định';
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`
    );
    if (!response.ok) {
      throw new Error('Nominatim geocoding request failed');
    }
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  } catch (error) {
    console.warn('[ReverseGeocode] Cannot convert coordinates to address:', error);
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }
};
