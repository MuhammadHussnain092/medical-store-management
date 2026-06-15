import React from 'react';
export default function Loader({ size = 40 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: size, height: size, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="spinner" />
    </div>
  );
}
