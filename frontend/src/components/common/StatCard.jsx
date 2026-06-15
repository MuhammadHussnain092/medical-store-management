import React from 'react';
export default function StatCard({ title, value, icon: Icon, color, bg, change, subtitle }) {
  return (
    <div className="card card-hover" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, background: bg || 'rgba(37,99,235,0.1)', borderRadius: '50%', opacity: 0.5 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, background: bg || 'rgba(37,99,235,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon && <Icon size={24} style={{ color: color || 'var(--primary)' }} />}
        </div>
        {change !== undefined && (
          <span className={`badge ${change >= 0 ? 'badge-success' : 'badge-danger'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}
