import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nearbyWorkers: [],
  selectedWorkerId: null,
  currentWorkerProfile: null,
  currentWorkerStatus: 'OFFLINE', // Default status is OFFLINE until worker explicitly turns ON

  incomingJobRequest: null, // Popup emergency dispatch for MUA
};

const workerSlice = createSlice({
  name: 'worker',
  initialState,
  reducers: {
    setNearbyWorkers: (state, action) => {
      state.nearbyWorkers = action.payload;
    },
    setSelectedWorkerId: (state, action) => {
      state.selectedWorkerId = action.payload;
    },
    setCurrentWorkerProfile: (state, action) => {
      state.currentWorkerProfile = action.payload;
    },
    toggleWorkerStatus: (state) => {
      state.currentWorkerStatus = state.currentWorkerStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    },
    setWorkerStatus: (state, action) => {
      state.currentWorkerStatus = action.payload;
    },
    setIncomingJobRequest: (state, action) => {
      state.incomingJobRequest = action.payload;
    }
  },
});

export const { 
  setNearbyWorkers, 
  setSelectedWorkerId, 
  setCurrentWorkerProfile, 
  toggleWorkerStatus, 
  setWorkerStatus,
  setIncomingJobRequest
} = workerSlice.actions;

export default workerSlice.reducer;
