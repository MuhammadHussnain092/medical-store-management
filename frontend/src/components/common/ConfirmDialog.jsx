import React from 'react';
import { MdWarning, MdClose } from 'react-icons/md';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', confirmColor = '#EF4444', loading = false }) {
  if (!isOpen) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:20, padding:32, maxWidth:420, width:'100%', boxShadow:'0 25px 60px rgba(0,0,0,0.4)', animation:'fadeIn 0.2s' }}>
        {/* Icon */}
        <div style={{ width:56, height:56, background:`rgba(239,68,68,0.1)`, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <MdWarning size={28} style={{ color:'#EF4444' }} />
        </div>
        {/* Title */}
        <h3 style={{ fontSize:18, fontWeight:800, color:'var(--text)', textAlign:'center', marginBottom:10 }}>{title || 'Are you sure?'}</h3>
        {/* Message */}
        <p style={{ fontSize:14, color:'var(--text-muted)', textAlign:'center', lineHeight:1.6, marginBottom:28 }}>{message || 'This action cannot be undone.'}</p>
        {/* Buttons */}
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={onClose} disabled={loading}
            style={{ flex:1, padding:'12px 0', borderRadius:12, border:'2px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex:1, padding:'12px 0', borderRadius:12, border:'none', background: confirmColor, color:'white', fontSize:14, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
