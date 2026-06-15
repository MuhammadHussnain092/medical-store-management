import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdEdit, MdBuild, MdWarning } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TYPES = ['fridge','ac','printer','thermal_printer','computer','ups','generator','cctv','shelf','wifi_router','scanner','other'];
const CONDITIONS = ['excellent','good','fair','poor','broken'];
const COND_COLORS = { excellent:'badge-success', good:'badge-success', fair:'badge-warning', poor:'badge-danger', broken:'badge-danger' };
const ICONS = { fridge:'🧊', ac:'❄️', printer:'🖨️', thermal_printer:'🖨️', computer:'💻', ups:'🔋', generator:'⚡', cctv:'📷', shelf:'🗄️', wifi_router:'📶', scanner:'🔍', other:'🔧' };
const EMPTY = { name:'', type:'computer', brand:'', model:'', serialNo:'', purchaseDate:'', purchasePrice:'', warrantyExpiry:'', location:'', condition:'good', notes:'' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/assets'); setAssets(data.data); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!form.name) return toast.error('Asset name required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/assets/${editing._id}`, form); toast.success('Updated'); }
      else { await api.post('/assets', form); toast.success('Asset added'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const askDelete = (a) => { setDeleteTarget(a); setConfirmOpen(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/assets/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} deleted`);
      setConfirmOpen(false); setDeleteTarget(null);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const inp = f => ({ value: form[f]||'', onChange: e => setForm({...form,[f]:e.target.value}), className:'input-field' });
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK') : '—';
  const isServiceDue = a => a.nextServiceDate && new Date(a.nextServiceDate) <= new Date(Date.now() + 7*86400000);

  return (
    <div className="fade-in">
      <PageHeader title="Equipment Assets" subtitle={`${assets.length} assets tracked`}
        action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}><MdAdd size={18} /> Add Asset</button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
        {loading ? <Loader /> : assets.map(a => (
          <div key={a._id} className="card card-hover" style={{ padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:36 }}>{ICONS[a.type]||'🔧'}</div>
              <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                {isServiceDue(a) && <span className="badge badge-warning">⚠️ Service Due</span>}
                <span className={`badge ${COND_COLORS[a.condition]||'badge-info'}`} style={{ textTransform:'capitalize' }}>{a.condition}</span>
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{a.name}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, textTransform:'capitalize' }}>{a.type.replace('_',' ')} {a.brand && `• ${a.brand}`} {a.model && `${a.model}`}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10, padding:'10px 12px', background:'var(--bg)', borderRadius:8 }}>
              <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Location</div><div style={{ fontSize:12, fontWeight:600 }}>{a.location||'—'}</div></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Warranty</div><div style={{ fontSize:12, fontWeight:600 }}>{fmtDate(a.warrantyExpiry)}</div></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Last Service</div><div style={{ fontSize:12, fontWeight:600 }}>{fmtDate(a.lastServiceDate)}</div></div>
              <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Next Service</div><div style={{ fontSize:12, fontWeight:600, color:isServiceDue(a)?'#EF4444':'var(--text)' }}>{fmtDate(a.nextServiceDate)}</div></div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button onClick={() => { setEditing(a); setForm({...a, purchaseDate:a.purchaseDate?new Date(a.purchaseDate).toISOString().split('T')[0]:'', warrantyExpiry:a.warrantyExpiry?new Date(a.warrantyExpiry).toISOString().split('T')[0]:''}); setShowModal(true); }} className="btn btn-outline btn-sm" style={{ flex:1, justifyContent:'center' }}><MdEdit size={14} /> Edit</button>
        <button onClick={() => askDelete(a)} className="btn btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>🗑️</button>
      </div>
          </div>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing?'Edit Asset':'Add Equipment Asset'} maxWidth={620}
        footer={<><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Update':'Add Asset'}</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Asset Name *</label><input {...inp('name')} placeholder="e.g. Main Fridge" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Type</label>
            <select className="input-field" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1).replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Condition</label>
            <select className="input-field" value={form.condition} onChange={e => setForm({...form,condition:e.target.value})}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          {[['brand','Brand'],['model','Model'],['serialNo','Serial No'],['location','Location'],['purchasePrice','Purchase Price (PKR)']].map(([f,l]) => (
            <div key={f}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{l}</label><input {...inp(f)} placeholder={l} type={f==='purchasePrice'?'number':'text'} /></div>
          ))}
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Purchase Date</label><input {...inp('purchaseDate')} type="date" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Warranty Expiry</label><input {...inp('warrantyExpiry')} type="date" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Notes</label><textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete" />
    </div>
  );
}
