import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdLock, MdDashboard } from 'react-icons/md';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 80, height: 80, background: 'rgba(239,68,68,0.1)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <MdLock size={40} style={{ color: '#EF4444' }} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 6 }}>
          Your role <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>({user?.role})</strong> does not have permission to view this page.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
          Please contact your administrator if you believe this is an error.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <MdDashboard size={18} /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}
