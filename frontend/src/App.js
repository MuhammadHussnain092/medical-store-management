import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './store/slices/authSlice';
import { setAccentColor, setStoreName } from './store/slices/uiSlice';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import BillingPOS from './pages/BillingPOS';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Assets from './pages/Assets';
import UtilityBills from './pages/UtilityBills';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AccessDenied from './pages/AccessDenied';

// ─── Role permission map ───────────────────────────────────────────
export const ROLE_PERMISSIONS = {
  superadmin:        ['dashboard','medicines','billing','sales','purchases','suppliers','customers','inventory','staff','expenses','reports','assets','utility-bills','settings'],
  admin:             ['dashboard','medicines','billing','sales','purchases','suppliers','customers','inventory','staff','expenses','reports','assets','utility-bills','settings'],
  staff:             ['dashboard','billing','sales','customers','inventory'],
  accountant:        ['dashboard','expenses','reports','sales','purchases','utility-bills'],
  inventory_manager: ['dashboard','medicines','inventory','purchases','suppliers'],
};

// ─── Guards ──────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(s => s.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ page, children }) => {
  const { user } = useSelector(s => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  const allowed = ROLE_PERMISSIONS[user.role] || [];
  return allowed.includes(page) ? children : <AccessDenied />;
};

// ─── App ─────────────────────────────────────────────────────────
function App() {
  const dispatch = useDispatch();
  const { theme } = useSelector(s => s.ui);

  useEffect(() => {
    // 1. Restore auth session
    const token = localStorage.getItem('token');
    if (token) dispatch(getMe());

    // 2. Apply saved theme
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // 3. Restore saved accent color (CSS variables)
    try {
      const saved = localStorage.getItem('accentColor');
      if (saved) {
        const color = JSON.parse(saved);
        document.documentElement.style.setProperty('--primary', color.primary);
        document.documentElement.style.setProperty('--primary-dark', color.dark);
        document.documentElement.style.setProperty('--sidebar-active', color.primary);
        dispatch(setAccentColor(color));
      }
    } catch {}

    // 4. Restore store name
    const savedName = localStorage.getItem('storeName');
    if (savedName) dispatch(setStoreName(savedName));

    // 5. Load store settings (for invoice usage)
    try {
      const storeSettings = localStorage.getItem('storeSettings');
      if (storeSettings) {
        const parsed = JSON.parse(storeSettings);
        if (parsed.storeName) dispatch(setStoreName(parsed.storeName));
      }
    } catch {}
  }, [dispatch, theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"     element={<RoleRoute page="dashboard"><Dashboard /></RoleRoute>} />
          <Route path="medicines"     element={<RoleRoute page="medicines"><Medicines /></RoleRoute>} />
          <Route path="billing"       element={<RoleRoute page="billing"><BillingPOS /></RoleRoute>} />
          <Route path="sales"         element={<RoleRoute page="sales"><Sales /></RoleRoute>} />
          <Route path="purchases"     element={<RoleRoute page="purchases"><Purchases /></RoleRoute>} />
          <Route path="suppliers"     element={<RoleRoute page="suppliers"><Suppliers /></RoleRoute>} />
          <Route path="customers"     element={<RoleRoute page="customers"><Customers /></RoleRoute>} />
          <Route path="inventory"     element={<RoleRoute page="inventory"><Inventory /></RoleRoute>} />
          <Route path="staff"         element={<RoleRoute page="staff"><Staff /></RoleRoute>} />
          <Route path="expenses"      element={<RoleRoute page="expenses"><Expenses /></RoleRoute>} />
          <Route path="reports"       element={<RoleRoute page="reports"><Reports /></RoleRoute>} />
          <Route path="assets"        element={<RoleRoute page="assets"><Assets /></RoleRoute>} />
          <Route path="utility-bills" element={<RoleRoute page="utility-bills"><UtilityBills /></RoleRoute>} />
          <Route path="settings"      element={<RoleRoute page="settings"><Settings /></RoleRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
