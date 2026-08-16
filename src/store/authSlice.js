import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  roles: [],
  user: null,
  selectedRole: 'ROLE_CUSTOMER', // Active perspective ('ROLE_CUSTOMER' | 'ROLE_MUA' | 'ROLE_ADMIN')
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { accessToken, refreshToken, userId, roles, user } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.userId = userId;
      state.roles = roles || ['ROLE_CUSTOMER'];
      state.user = user || state.user;
      state.selectedRole = (roles && roles.includes('ROLE_MUA')) ? 'ROLE_MUA' : 'ROLE_CUSTOMER';
      state.isAuthenticated = true;
    },
    switchRole: (state, action) => {
      state.selectedRole = action.payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.userId = null;
      state.roles = [];
      state.user = null;
      state.selectedRole = 'ROLE_CUSTOMER';
      state.isAuthenticated = false;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    }
  },
});

export const { setCredentials, switchRole, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
