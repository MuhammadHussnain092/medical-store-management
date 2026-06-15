import React, { useState, useEffect } from 'react';
import { MdSettings, MdStore, MdPalette, MdNotifications, MdSecurity, MdSave, MdCheck, MdEdit } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme, setAccentColor, setStoreName } from '../store/slices/uiSlice';

import toast from 'react-hot-toast';

const COLOR_THEMES = [
  { name: 'Blue',    primary: '#2563EB', dark: '#1D4ED8', glow: 'rgba(37,99,235,0.4)' },
  { name: 'Emerald', primary: '#10B981', dark: '#059669', glow: 'rgba(16,185,129,0.4)' },
  { name: 'Violet',  primary: '#7C3AED', dark: '#6D28D9', glow: 'rgba(124,58,237,0.4)' },
  { name: 'Rose',    primary: '#E11D48', dark: '#BE123C', glow: 'rgba(225,29,72,0.4)'  },
  { name: 'Amber',   primary: '#D97706', dark: '#B45309', glow: 'rgba(217,119,6,0.4)'  },
  { name: 'Cyan',    primary: '#0891B2', dark: '#0E7490', glow: 'rgba(8,145,178,0.4)'  },
];

export default function Settings() {
  const dispatch = useDispatch();
  const { theme, accentColor } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);

  const [tab, setTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Store info — load from localStorage so it persists
  const [storeForm, setStoreForm] = useState(() => {
    try {
      const saved = localStorage.getItem('storeSettings');
      return saved ? JSON.parse(saved) : {
        storeName: 'Bilal Inayat Medical Store',
        storeAddress: 'Main Bazar, Lahore',
        storePhone: '0300-1234567',
        storeEmail: 'bilal@medical.com',
        currency: 'PKR',
        taxRate: '0',
        invoiceFooter: 'Thank you for your visit! Get well soon.',
      };
    } catch { return { storeName:'Bilal Inayat Medical Store', storeAddress:'', storePhone:'', storeEmail:'', currency:'PKR', taxRate:'0', invoiceFooter:'' }; }
  });

  // Password form
  const [passForm, setPassForm] = useState({ current:'', newPass:'', confirm:'' });

  // Notification toggles — load from localStorage
  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('notifSettings');
      return saved ? JSON.parse(saved) : {
        lowStock: true, expiry: true, dailySummary: false,
        supplierDue: true, utilityDue: true, maintenance: false,
      };
    } catch { return { lowStock:true, expiry:true, dailySummary:false, supplierDue:true, utilityDue:true, maintenance:false }; }
  });

  // Apply accent color on mount and whenever it changes
  useEffect(() => {
    if (accentColor) applyColor(accentColor, false);
  }, [accentColor]);

  const applyColor = (colorObj, save = true) => {
    document.documentElement.style.setProperty('--primary', colorObj.primary);
    document.documentElement.style.setProperty('--primary-dark', colorObj.dark);
    document.documentElement.style.setProperty('--sidebar-active', colorObj.primary);
    if (save) {
      dispatch(setAccentColor(colorObj));
      toast.success(`🎨 ${colorObj.name} theme applied!`);
    }
  };

  const handleSaveStore = async () => {
    if (!storeForm.storeName.trim()) return toast.error('Store name cannot be empty');
    setSaving(true);
    try {
      // Save to localStorage (persists across sessions)
      localStorage.setItem('storeSettings', JSON.stringify(storeForm));
      // Update Redux store name for navbar display
      dispatch(setStoreName(storeForm.storeName));
      await new Promise(r => setTimeout(r, 500));
      setSaved(true);
      toast.success('✅ Store settings saved!');
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleSaveNotifs = () => {
    localStorage.setItem('notifSettings', JSON.stringify(notifSettings));
    toast.success('✅ Notification preferences saved!');
  };

  const handleChangePassword = async () => {
    if (!passForm.current) return toast.error('Enter current password');
    if (!passForm.newPass)  return toast.error('Enter new password');
    if (passForm.newPass.length < 6) return toast.error('Password must be at least 6 characters');
    if (passForm.newPass !== passForm.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      const api = (await import('../utils/api')).default;
      await api.put('/auth/change-password', { currentPassword: passForm.current, newPassword: passForm.newPass });
      toast.success('✅ Password updated successfully!');
      setPassForm({ current:'', newPass:'', confirm:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally { setSaving(false); }
  };

  const inp = (f, obj = storeForm, setter = setStoreForm) => ({
    value: obj[f] || '',
    onChange: e => setter({ ...obj, [f]: e.target.value }),
    className: 'input-field',
  });

  const TABS = [
    ['store',        '🏪 Store Info',       MdStore],
    ['appearance',   '🎨 Appearance',       MdPalette],
    ['notifications','🔔 Notifications',    MdNotifications],
    ['security',     '🔒 Security',         MdSecurity],
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Configure your store preferences and system options" />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: 10 }}>
          {TABS.map(([v, l, Icon]) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: tab === v ? 'var(--primary)' : 'transparent', color: tab === v ? 'white' : 'var(--text)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === v ? 700 : 500, marginBottom: 3, fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'left' }}>
              <Icon size={18} /> {l}
            </button>
          ))}
        </div>

        {/* ── Tab: Store Info ── */}
        {tab === 'store' && (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Store Information</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>This info appears on invoices and receipts</p>
              </div>
              {saved && <span className="badge badge-success"><MdCheck size={12} /> Saved</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Store Name *</label>
                <input {...inp('storeName')} placeholder="Your store name" style={{ fontSize: 16, fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input {...inp('storePhone')} placeholder="0300-0000000" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email Address</label>
                <input {...inp('storeEmail')} type="email" placeholder="store@email.com" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Address</label>
                <textarea className="input-field" rows={2} value={storeForm.storeAddress} onChange={e => setStoreForm({...storeForm, storeAddress: e.target.value})} placeholder="Full store address" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Currency</label>
                <select className="input-field" value={storeForm.currency} onChange={e => setStoreForm({...storeForm, currency: e.target.value})}>
                  <option value="PKR">PKR — Pakistani Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Default Tax Rate (%)</label>
                <input {...inp('taxRate')} type="number" min={0} max={100} placeholder="0" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Invoice Footer Message</label>
                <textarea className="input-field" rows={2} value={storeForm.invoiceFooter} onChange={e => setStoreForm({...storeForm, invoiceFooter: e.target.value})} placeholder="e.g. Thank you for your visit! Get well soon." />
              </div>
            </div>

            {/* Live Preview */}
            <div style={{ marginTop: 24, padding: 20, background: 'var(--bg)', borderRadius: 14, border: '2px dashed var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>📄 Invoice Preview</p>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{storeForm.storeName || 'Your Store Name'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{storeForm.storeAddress}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{storeForm.storePhone} {storeForm.storeEmail && `| ${storeForm.storeEmail}`}</p>
                {storeForm.invoiceFooter && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>{storeForm.invoiceFooter}</p>}
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSaveStore} disabled={saving}>
              {saving ? '⏳ Saving...' : <><MdSave size={16} /> Save Store Settings</>}
            </button>
          </div>
        )}

        {/* ── Tab: Appearance ── */}
        {tab === 'appearance' && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Appearance</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Customize the look and feel of your dashboard</p>

            {/* Light / Dark */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🌗 Color Mode</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['light', '☀️ Light Mode', 'Clean white interface'],
                  ['dark',  '🌙 Dark Mode',  'Easy on the eyes'],
                ].map(([v, title, desc]) => (
                  <div key={v} onClick={() => theme !== v && dispatch(toggleTheme())}
                    style={{ padding: 18, borderRadius: 14, border: `2px solid ${theme === v ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', background: theme === v ? 'rgba(37,99,235,0.06)' : 'var(--bg)', transition: 'all 0.2s', position: 'relative' }}>
                    {theme === v && <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MdCheck size={12} color="white" /></div>}
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{v === 'light' ? '☀️' : '🌙'}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accent Colors — these ACTUALLY change the primary CSS variable */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎨 Accent Color</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Changes buttons, active links, and highlights across the system</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {COLOR_THEMES.map(ct => {
                  const isActive = accentColor?.name === ct.name || (!accentColor && ct.name === 'Blue');
                  return (
                    <div key={ct.name} onClick={() => applyColor(ct)}
                      style={{ padding: '14px 12px', borderRadius: 14, border: `2px solid ${isActive ? ct.primary : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', background: isActive ? `${ct.primary}10` : 'var(--bg)' }}>
                      {isActive && (
                        <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, background: ct.primary, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MdCheck size={11} color="white" />
                        </div>
                      )}
                      <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${ct.primary}, ${ct.dark})`, borderRadius: 12, marginBottom: 10, boxShadow: isActive ? `0 4px 14px ${ct.glow}` : 'none', transition: 'box-shadow 0.2s' }} />
                      <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? ct.primary : 'var(--text)' }}>{ct.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ct.primary}</div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                ✅ Click any color to apply it instantly — no save needed
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: Notifications ── */}
        {tab === 'notifications' && (
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Notification Preferences</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Control which alerts you receive in the system</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['lowStock',    '⚠️ Low Stock Alerts',              'Alert when medicines fall below minimum stock level'],
                ['expiry',      '🕐 Expiry Alerts',                 'Alert when medicines are expiring within 30 days'],
                ['dailySummary','📊 Daily Revenue Summary',          'Daily sales report at end of day'],
                ['supplierDue', '💰 Supplier Payment Reminders',     'Reminders for outstanding supplier dues'],
                ['utilityDue',  '⚡ Utility Bill Due Alerts',        'Alerts when utility bills are near due date'],
                ['maintenance', '🔧 Equipment Maintenance Reminders','Reminders for scheduled equipment service'],
              ].map(([key, title, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                  {/* Toggle Switch */}
                  <div onClick={() => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{ width: 46, height: 26, background: notifSettings[key] ? 'var(--primary)' : 'var(--border)', borderRadius: 13, cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: notifSettings[key] ? 23 : 3, transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={handleSaveNotifs}>
              <MdSave size={16} /> Save Notification Settings
            </button>
          </div>
        )}

        {/* ── Tab: Security ── */}
        {tab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Current user info */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👤 Account Info</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #2563EB, #6366F1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
                  <span className="badge badge-info" style={{ marginTop: 4, textTransform: 'capitalize' }}>{user?.role?.replace('_',' ')}</span>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔑 Change Password</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Keep your account secure with a strong password</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['current', '🔒 Current Password', 'current'],
                  ['newPass', '🔑 New Password',     'newPass'],
                  ['confirm', '✅ Confirm Password', 'confirm'],
                ].map(([f, label]) => (
                  <div key={f}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input className="input-field" type="password"
                      value={passForm[f]}
                      onChange={e => setPassForm({...passForm, [f]: e.target.value})}
                      placeholder={f === 'current' ? 'Your current password' : f === 'newPass' ? 'Min 6 characters' : 'Repeat new password'} />
                  </div>
                ))}
                {passForm.newPass && passForm.confirm && passForm.newPass !== passForm.confirm && (
                  <p style={{ color: '#EF4444', fontSize: 12 }}>❌ Passwords do not match</p>
                )}
                {passForm.newPass && passForm.confirm && passForm.newPass === passForm.confirm && (
                  <p style={{ color: '#10B981', fontSize: 12 }}>✅ Passwords match</p>
                )}
                <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleChangePassword} disabled={saving}>
                  {saving ? '⏳ Updating...' : '🔐 Update Password'}
                </button>
              </div>
            </div>

            {/* Session */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📱 Session Management</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Sign out from all other devices for security</p>
              <button className="btn btn-danger btn-sm" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); toast.success('All sessions terminated. Please log in again.'); setTimeout(() => window.location.href = '/login', 1500); }}>
                🚪 Logout from All Devices
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
