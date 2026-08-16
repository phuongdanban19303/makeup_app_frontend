import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  latitude: 10.776889,
  longitude: 106.700806,
  address: '720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
  radiusKm: 5.0,
  isGpsLocating: false,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCoordinates: (state, action) => {
      state.latitude = action.payload.latitude;
      state.longitude = action.payload.longitude;
      if (action.payload.address) {
        state.address = action.payload.address;
      }
    },
    setAddress: (state, action) => {
      state.address = action.payload;
    },
    setRadiusKm: (state, action) => {
      state.radiusKm = action.payload;
    },
    setGpsLocating: (state, action) => {
      state.isGpsLocating = action.payload;
    }
  },
});

export const { setCoordinates, setAddress, setRadiusKm, setGpsLocating } = locationSlice.actions;
export default locationSlice.reducer;
