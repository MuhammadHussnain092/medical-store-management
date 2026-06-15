import React, { useState, useEffect } from 'react';
import { MdInventory2, MdWarning, MdSchedule } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Loader from '../components/common/Loader';
import api from '../utils/api';

export default function Inventory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = tab === 'lowstock' ? '?lowStock=true' : tab === 'expiring' ? '?expiring=true' : '?limit=100';
        const { data } = await api.get(`/medicines${params}`);
        setMedicines(data.data);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, [tab]);

  const totalValue = medicines.reduce((s, m) => s + (m.quantity * m.purchasePrice), 0);

  return (
    <div className="fade-in">
      <PageHeader title="Inventory" subtitle="Track stock levels, expiry and valuations" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:20 }}>
        {[
          { label:'Total Items', value:medicines.length, color:'#2563EB', bg:'rgba(37,99,235,0.1)' },
          { label:'Stock Value', value:`PKR ${(totalValue/1000).toFixed(1)}K`, color:'#10B981', bg:'rgba(16,185,129,0.1)' },
          { label:'Low Stock', value:medicines.filter(m=>m.quantity<=m.minStockLevel).length, color:'#F59E0B', bg:'rgba(245,158,11,0.1)' },
          { label:'Out of Stock', value:medicines.filter(m=>m.quantity===0).length, color:'#EF4444', bg:'rgba(239,68,68,0.1)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:20 }}>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding:16, marginBottom:20, display:'flex', gap:10 }}>
        {[['all','All Stock'],['lowstock','⚠️ Low Stock'],['expiring','🕐 Expiring Soon']].map(([v,l]) => (
          <button key={v} className={`btn btn-sm ${tab===v?'btn-primary':'btn-outline'}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>
      <div className="card">
        {loading ? <Loader /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Medicine</th><th>Category</th><th>Batch</th><th>In Stock</th><th>Min Level</th><th>Expiry</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                {medicines.length === 0 ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No items found</td></tr>
                : medicines.map(m => {
                  const isLow = m.quantity <= m.minStockLevel;
                  const daysLeft = m.expiryDate ? Math.ceil((new Date(m.expiryDate) - new Date()) / 86400000) : null;
                  return (
                    <tr key={m._id}>
                      <td><div style={{ fontWeight:600, fontSize:13 }}>{m.name}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.genericName}</div></td>
                      <td><span className="badge badge-info">{m.category?.name||'—'}</span></td>
                      <td style={{ fontSize:12, fontFamily:'monospace' }}>{m.batchNo||'—'}</td>
                      <td><span style={{ fontWeight:700, color:m.quantity===0?'#EF4444':isLow?'#F59E0B':'var(--text)' }}>{m.quantity} {m.unit}</span></td>
                      <td style={{ fontSize:13 }}>{m.minStockLevel}</td>
                      <td>{daysLeft!=null ? <span style={{ color:daysLeft<=7?'#EF4444':daysLeft<=30?'#F59E0B':'var(--text)', fontSize:12 }}>{new Date(m.expiryDate).toLocaleDateString('en-PK')}</span> : '—'}</td>
                      <td style={{ fontWeight:600, color:'var(--secondary)' }}>PKR {(m.quantity*m.purchasePrice).toLocaleString()}</td>
                      <td>{m.quantity===0?<span className="badge badge-danger">Out of Stock</span>:isLow?<span className="badge badge-warning">⚠️ Low</span>:<span className="badge badge-success">In Stock</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
