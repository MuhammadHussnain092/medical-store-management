import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdEdit, MdBolt, MdWater, MdWifi } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TYPES = ['electricity','gas','water','internet'];
const TYPE_ICONS = { electricity:'⚡', gas:'🔥', water:'💧', internet:'🌐' };
const TYPE_COLORS = { electricity:'#F59E0B', gas:'#EF4444', water:'#06B6D4', internet:'#6366F1' };
const EMPTY = { type:'electricity', amount:'', dueDate:'', billDate:'', billNo:'', notes:'' };

export default function UtilityBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/utility-bills'); setBills(data.data); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!form.amount || !form.dueDate) return toast.error('Amount and due date required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/utility-bills/${editing._id}`, form); toast.success('Updated'); }
      else { await api.post('/utility-bills', form); toast.success('Bill added'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const markPaid = async (id) => {
    try { await api.put(`/utility-bills/${id}`, { status:'paid', paidDate:new Date() }); toast.success('Marked as paid'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const totalPending = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const inp = f => ({ value: form[f]||'', onChange: e => setForm({...form,[f]:e.target.value}), className:'input-field' });

  return (
    <div className="fade-in">
      <PageHeader title="Utility Bills" subtitle="Track electricity, gas, water and internet bills"
        action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}><MdAdd size={18} /> Add Bill</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:20 }}>
        {TYPES.map(t => {
          const typeBills = bills.filter(b => b.type === t);
          const pending = typeBills.filter(b => b.status !== 'paid');
          return (
            <div key={t} className="card" style={{ padding:18 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{TYPE_ICONS[t]}</div>
              <div style={{ fontWeight:700, fontSize:15, textTransform:'capitalize', marginBottom:4 }}>{t}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{pending.length} pending</div>
              {pending.length > 0 && <div style={{ marginTop:8, fontWeight:700, color:TYPE_COLORS[t] }}>PKR {pending.reduce((s,b)=>s+b.amount,0).toLocaleString()}</div>}
            </div>
          );
        })}
        <div className="card" style={{ padding:18, background:'rgba(239,68,68,0.05)', border:'2px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💰</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Total Pending</div>
          <div style={{ fontWeight:800, fontSize:20, color:'#EF4444' }}>PKR {totalPending.toLocaleString()}</div>
        </div>
      </div>
      <div className="card">
        {loading ? <Loader /> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Type</th><th>Bill No</th><th>Amount</th><th>Bill Date</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bills.length === 0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No bills found</td></tr>
                : bills.map(b => {
                  const isOverdue = b.status !== 'paid' && new Date(b.dueDate) < new Date();
                  return (
                    <tr key={b._id}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:18 }}>{TYPE_ICONS[b.type]}</span><span style={{ fontWeight:600, textTransform:'capitalize' }}>{b.type}</span></div></td>
                      <td style={{ fontSize:12, fontFamily:'monospace' }}>{b.billNo||'—'}</td>
                      <td style={{ fontWeight:700, color:TYPE_COLORS[b.type] }}>PKR {b.amount?.toLocaleString()}</td>
                      <td style={{ fontSize:12, color:'var(--text-muted)' }}>{b.billDate?new Date(b.billDate).toLocaleDateString('en-PK'):'—'}</td>
                      <td style={{ fontSize:12, color:isOverdue?'#EF4444':'var(--text)' }}>{new Date(b.dueDate).toLocaleDateString('en-PK')}{isOverdue && ' ⚠️'}</td>
                      <td><span className={`badge ${b.status==='paid'?'badge-success':isOverdue?'badge-danger':'badge-warning'}`} style={{ textTransform:'capitalize' }}>{isOverdue&&b.status!=='paid'?'Overdue':b.status}</span></td>
                      <td style={{ display:'flex', gap:6 }}>
                        {b.status !== 'paid' && <button onClick={() => markPaid(b._id)} className="btn btn-sm btn-secondary" style={{ fontSize:11, padding:'4px 10px' }}>Mark Paid</button>}
                        <button onClick={() => { setEditing(b); setForm({...b, dueDate:new Date(b.dueDate).toISOString().split('T')[0], billDate:b.billDate?new Date(b.billDate).toISOString().split('T')[0]:''}); setShowModal(true); }} className="btn btn-outline btn-icon btn-sm"><MdEdit size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing?'Edit Bill':'Add Utility Bill'} maxWidth={480}
        footer={<><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Update':'Add Bill'}</button></>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Type</label>
            <select className="input-field" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Amount (PKR) *</label><input {...inp('amount')} type="number" placeholder="0" /></div>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Bill No</label><input {...inp('billNo')} placeholder="Bill reference" /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Bill Date</label><input {...inp('billDate')} type="date" /></div>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Due Date *</label><input {...inp('dueDate')} type="date" /></div>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Notes</label><textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
      </Modal>
    </div>
  );
}
