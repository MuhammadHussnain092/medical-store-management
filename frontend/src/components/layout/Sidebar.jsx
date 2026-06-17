import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { ROLE_PERMISSIONS } from '../../App';
import {
  MdDashboard, MdMedication, MdPointOfSale, MdShoppingCart,
  MdPeople, MdAttachMoney, MdBarChart, MdSettings, MdBolt,
  MdBuild, MdPersonSearch, MdLogout, MdChevronLeft, MdChevronRight,
  MdLocalHospital, MdSupervisorAccount, MdInventory2, MdReceipt
} from 'react-icons/md';
import toast from 'react-hot-toast';

const ALL_NAV = [
  { label: 'Dashboard',    icon: MdDashboard,        to: '/dashboard',     page: 'dashboard' },
  { label: 'Medicines',    icon: MdMedication,        to: '/medicines',     page: 'medicines' },
  { label: 'Billing / POS',icon: MdPointOfSale,      to: '/billing',       page: 'billing' },
  { label: 'Sales',        icon: MdShoppingCart,      to: '/sales',         page: 'sales' },
  { label: 'Purchases',    icon: MdReceipt,           to: '/purchases',     page: 'purchases' },
  { label: 'Suppliers',    icon: MdPersonSearch,      to: '/suppliers',     page: 'suppliers' },
  { label: 'Customers',    icon: MdPeople,            to: '/customers',     page: 'customers' },
  { label: 'Inventory',    icon: MdInventory2,        to: '/inventory',     page: 'inventory' },
  { label: 'Staff',        icon: MdSupervisorAccount, to: '/staff',         page: 'staff' },
  { label: 'Expenses',     icon: MdAttachMoney,       to: '/expenses',      page: 'expenses' },
  { label: 'Reports',      icon: MdBarChart,          to: '/reports',       page: 'reports' },
  { label: 'Assets',       icon: MdBuild,             to: '/assets',        page: 'assets' },
  { label: 'Utility Bills',icon: MdBolt,              to: '/utility-bills', page: 'utility-bills' },
  { label: 'Settings',     icon: MdSettings,          to: '/settings',      page: 'settings' },
];

export default function Sidebar({ mobileOpen, setMobileOpen, isMobile }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sidebarCollapsed, storeName } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);
  
  const w = isMobile ? '260px' : (sidebarCollapsed ? '72px' : '260px');
  const leftVal = isMobile ? (mobileOpen ? '0' : '-260px') : '0';

  // Filter nav by role permissions
  const allowedPages = ROLE_PERMISSIONS[user?.role] || [];
  const navItems = ALL_NAV.filter(item => allowedPages.includes(item.page));

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Role badge colors
  const ROLE_COLORS = {
    superadmin: 'linear-gradient(135deg, #EF4444, #DC2626)',
    admin: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    staff: 'linear-gradient(135deg, #10B981, #059669)',
    accountant: 'linear-gradient(135deg, #F59E0B, #D97706)',
    inventory_manager: 'linear-gradient(135deg, #6366F1, #4F46E5)',
  };

  return (
    <aside style={{
      width: w, minWidth: w, background: 'var(--sidebar-bg)', height: '100vh',
      position: 'fixed', top: 0, left: leftVal, zIndex: 100,
      display: 'flex', flexDirection: 'column', transition: 'width 0.3s, left 0.3s',
      overflowX: 'hidden', overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 64 }}>
        <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #2563EB, #10B981)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
          <MdLocalHospital size={22} color="white" />
        </div>
        {!sidebarCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}>{storeName || 'Bilal Inayat'}</div>
            <div style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>Medical Store</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!sidebarCollapsed && user && (
        <div style={{ margin: '12px 10px 4px', padding: '8px 12px', background: ROLE_COLORS[user.role] || 'rgba(37,99,235,0.2)', borderRadius: 10 }}>
          <div style={{ color: 'white', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>Logged in as</div>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
            {user.role.replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ label, icon: Icon, to }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            style={{ justifyContent: (sidebarCollapsed && !isMobile) ? 'center' : 'flex-start' }}
            onClick={() => isMobile && setMobileOpen(false)}
            title={(sidebarCollapsed && !isMobile) ? label : ''}>
            <Icon size={20} style={{ flexShrink: 0 }} />
            {(!sidebarCollapsed || isMobile) && <span style={{ fontSize: 13 }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!sidebarCollapsed && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, background: ROLE_COLORS[user.role] || 'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ color: '#475569', fontSize: 11, textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</div>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="sidebar-link"
          style={{ width: '100%', background: 'none', border: 'none', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          <MdLogout size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          {!sidebarCollapsed && <span style={{ color: '#EF4444', fontSize: 13 }}>Logout</span>}
        </button>
        <button onClick={() => dispatch(toggleSidebar())} className="sidebar-link"
          style={{ width: '100%', background: 'none', border: 'none', marginTop: 4, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          {sidebarCollapsed ? <MdChevronRight size={18} /> : <><MdChevronLeft size={18} /><span style={{ fontSize: 13 }}>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
