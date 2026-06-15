import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { login } from '../store/slices/authSlice';
import { MdLocalHospital, MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector(s => s.auth);
  // FIX: empty fields — no prefilled credentials
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    dispatch(login(form));
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 44px',
    background: 'rgba(15,23,42,0.6)', border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: 'white', fontSize: 14, outline: 'none',
    fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #2563EB, #10B981)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 20px 40px rgba(37,99,235,0.4)' }}>
            <MdLocalHospital size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Bilal Inayat</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Medical Store Management System</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 36, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 28 }}>Sign in to your account</p>

          {/* Error message */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ color: '#FCA5A5', fontSize: 13, fontWeight: 500 }}>❌ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 7 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <MdEmail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 7 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <MdLock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = '#2563EB'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}>
                  {showPass ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !form.email || !form.password}
              style={{ width: '100%', padding: 14, background: (loading || !form.email || !form.password) ? '#374151' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: (loading || !form.email || !form.password) ? 'not-allowed' : 'pointer', marginTop: 6, boxShadow: '0 8px 20px rgba(37,99,235,0.3)', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          {/* Demo credentials hint box */}
          <div style={{ marginTop: 24, padding: 14, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12 }}>
            <p style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Credentials</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Super Admin', 'admin@bilalmedical.com', 'Admin@123'],
                ['Staff', 'ali@bilalmedical.com', 'Staff@123'],
                ['Accountant', 'sara@bilalmedical.com', 'Staff@123'],
              ].map(([role, email, pass]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{role}: {email}</span>
                  <button onClick={() => setForm({ email, password: pass })}
                    style={{ background: 'rgba(37,99,235,0.2)', border: 'none', borderRadius: 6, padding: '2px 8px', color: '#93C5FD', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                    USE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 20 }}>© 2024 Bilal Inayat Medical Store</p>
      </div>
    </div>
  );
}
