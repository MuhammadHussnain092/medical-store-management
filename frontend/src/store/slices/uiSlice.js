import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: localStorage.getItem('theme') || 'light',
    sidebarOpen: true,
    sidebarCollapsed: false,
    notifications: [],
    unreadCount: 0,
    accentColor: (() => {
      try { return JSON.parse(localStorage.getItem('accentColor')) || null; } catch { return null; }
    })(),
    storeName: localStorage.getItem('storeName') || 'Bilal Inayat Medical Store',
  },
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setNotifications: (state, action) => {
      state.notifications = action.payload.data || [];
      state.unreadCount = action.payload.unreadCount || 0;
    },
    setAccentColor: (state, action) => {
      state.accentColor = action.payload;
      localStorage.setItem('accentColor', JSON.stringify(action.payload));
    },
    setStoreName: (state, action) => {
      state.storeName = action.payload;
      localStorage.setItem('storeName', action.payload);
    },
  },
});

export const {
  toggleTheme, setSidebarOpen, toggleSidebar,
  setNotifications, setAccentColor, setStoreName
} = uiSlice.actions;
export default uiSlice.reducer;
