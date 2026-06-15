import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme, setNotifications } from '../../store/slices/uiSlice';
import { MdDarkMode, MdLightMode, MdNotifications, MdSearch, MdLocalHospital } from 'react-icons/md';
import api from '../../utils/api';

export default function Navbar({ setMobileOpen }) {
  const dispatch = useDispatch();
  const { theme, unreadCount, notifications, storeName } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        dispatch(setNotifications(data));
      } catch {}
    };
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, [dispatch]);

  // Close notif dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.notif-container')) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ROLE_BADGE = {
    superadmin:        { label: 'Super Admin',      color: '#EF4444' },
    admin:             { label: 'Admin',             color: '#2563EB' },
    staff:             { label: 'Staff',             color: '#10B981' },
    accountant:        { label: 'Accountant',        color: '#F59E0B' },
    inventory_manager: { label: 'Inv. Manager',      color: '#6366F1' },
  };
  const roleBadge = ROLE_BADGE[user?.role] || { label: user?.role, color: '#64748B' };

  return (
    <header style={{
      height: 64,
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>

      {/* Store name (dynamic from settings) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <MdLocalHospital size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {storeName}
        </span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 380, position: 'relative' }}>
        <MdSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input-field"
          style={{ paddingLeft: 36, height: 36, fontSize: 13 }}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="btn btn-outline btn-icon"
          title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {theme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }} className="notif-container">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="btn btn-outline btn-icon"
            style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <MdNotifications size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 16, height: 16,
                background: '#EF4444', borderRadius: '50%',
                fontSize: 9, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, border: '2px solid var(--bg-card)',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifs && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 340, background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 16,
              boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                {unreadCount > 0 && <span className="badge badge-info">{unreadCount} new</span>}
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                    <p style={{ fontSize: 13 }}>No notifications yet</p>
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n._id} style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border)',
                    background: !n.readBy?.includes(user?._id) ? 'rgba(37,99,235,0.04)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleDateString('en-PK')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 14 }}>
          <div style={{
            width: 34, height: 34,
            background: `linear-gradient(135deg, ${roleBadge.color}, ${roleBadge.color}bb)`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{user?.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: roleBadge.color }}>{roleBadge.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
