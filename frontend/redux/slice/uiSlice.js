import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'light',
  isLoading: false,
  modalVisible: false,
  modalContent: null,
  toast: {
    visible: false,
    message: '',
    type: 'info',
  },
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    showModal: (state, action) => {
      state.modalVisible = true;
      state.modalContent = action.payload;
    },
    hideModal: (state) => {
      state.modalVisible = false;
      state.modalContent = null;
    },
    showToast: (state, action) => {
      state.toast = {
        visible: true,
        ...action.payload,
      };
    },
    hideToast: (state) => {
      state.toast.visible = false;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setLoading,
  showModal,
  hideModal,
  showToast,
  hideToast,
  toggleSidebar,
} = uiSlice.actions;

export default uiSlice.reducer;