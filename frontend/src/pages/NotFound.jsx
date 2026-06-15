import React from 'react';
import { useNavigate } from 'react-router-dom';
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:80, fontWeight:900, color:'var(--border)', marginBottom:16 }}>404</div>
        <h2 style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Page Not Found</h2>
        <p style={{ color:'var(--text-muted)', marginBottom:24 }}>The page you're looking for doesn't exist.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    </div>
  );
}
