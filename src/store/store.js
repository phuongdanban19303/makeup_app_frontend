import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage
import authReducer from './authSlice';
import locationReducer from './locationSlice';
import bookingReducer from './bookingSlice';
import workerReducer from './workerSlice';
import { setReduxStoreRef } from '../api/axiosInstance';

const rootReducer = combineReducers({
  auth: authReducer,
  location: locationReducer,
  booking: bookingReducer,
  worker: workerReducer,
});

const persistConfig = {
  key: 'makeup_app_root',
  version: 1,
  storage,
  whitelist: ['auth', 'location'], // Persist auth & location state across refresh
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Attach Redux store reference to Axios interceptor
setReduxStoreRef(store);
