import React from 'react';
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      {Icon && <Icon size={64} style={{ color: 'var(--border)', marginBottom: 16 }} />}
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
      {description && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>{description}</p>}
      {action}
    </div>
  );
}
