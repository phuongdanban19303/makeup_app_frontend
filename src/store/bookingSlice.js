import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeBooking: null, // Currently active booking in progress
  draftCheckout: {
    worker: null,
    service: null,
    scheduledTime: '',
    note: '',
    pricing: null
  },
  bookingHistory: []
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setActiveBooking: (state, action) => {
      if (action.payload) {
        const bId = action.payload.bookingId || action.payload.id;
        const normalized = { ...action.payload, bookingId: bId };
        state.activeBooking = normalized;
        const index = state.bookingHistory.findIndex(b => (b.bookingId || b.id) === bId);
        if (index >= 0) {
          state.bookingHistory[index] = normalized;
        } else {
          state.bookingHistory.unshift(normalized);
        }
      } else {
        state.activeBooking = null;
      }
    },
    updateBookingStatus: (state, action) => {
      if (state.activeBooking) {
        state.activeBooking.status = action.payload;
        const bId = state.activeBooking.bookingId || state.activeBooking.id;
        const index = state.bookingHistory.findIndex(b => (b.bookingId || b.id) === bId);
        if (index >= 0) {
          state.bookingHistory[index].status = action.payload;
        }
      }
    },
    setDraftCheckout: (state, action) => {
      state.draftCheckout = { ...state.draftCheckout, ...action.payload };
    },
    clearDraftCheckout: (state) => {
      state.draftCheckout = {
        worker: null,
        service: null,
        scheduledTime: '',
        note: '',
        pricing: null
      };
    },
    clearActiveBooking: (state) => {
      state.activeBooking = null;
    }
  },
});

export const { 
  setActiveBooking, 
  updateBookingStatus, 
  setDraftCheckout, 
  clearDraftCheckout,
  clearActiveBooking 
} = bookingSlice.actions;

export default bookingSlice.reducer;
