import React from 'react';
import { MdClose } from 'react-icons/md';
export default function Modal({ isOpen, onClose, title, children, maxWidth = 600, footer }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} className="btn btn-outline btn-icon"><MdClose size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}
