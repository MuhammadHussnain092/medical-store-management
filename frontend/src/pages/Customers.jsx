import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdPhone, MdEmail, MdLocationOn, MdStar } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EMPTY = { name:'', phone:'', email:'', address:'', notes:'' };

export default function Customers() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [viewMode, setViewMode]     = useState('table');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${search}&page=${page}&limit=20`);
      setCustomers(data.data); setTotal(data.total);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm(c); setShowModal(true); };
  const askDelete= (c) => { setDeleteTarget(c); setConfirmOpen(true); };

  const handleSave = async () => {
    if (!form.name) return toast.error('Customer name is required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/customers/${editing._id}`, form); toast.success('Customer updated'); }
      else { await api.post('/customers', form); toast.success('Customer added'); }
      setShowModal(false); fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} deleted`);
      setConfirmOpen(false); setDeleteTarget(null);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const inp = f => ({ value: form[f]||'', onChange: e => setForm({...form,[f]:e.target.value}), className:'input-field' });
  const totalRevenue = customers.reduce((s,c) => s+(c.totalPurchases||0), 0);
  const totalPoints  = customers.reduce((s,c) => s+(c.loyaltyPoints||0), 0);

  return (
    <div className="fade-in">
      <PageHeader title="Customers" subtitle={`${total} registered customers`}
        action={<button className="btn btn-primary" onClick={openAdd}><MdAdd size={18} /> Add Customer</button>} />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:20 }}>
        {[
          { label:'Total Customers', value:total, color:'#2563EB', icon:'👥' },
          { label:'Total Revenue',   value:`PKR ${(totalRevenue/1000).toFixed(1)}K`, color:'#10B981', icon:'💰' },
          { label:'Loyalty Points',  value:totalPoints.toLocaleString(), color:'#F59E0B', icon:'⭐' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:18 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="card" style={{ padding:14, marginBottom:20, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:240 }}>
          <MdSearch size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input className="input-field" style={{ paddingLeft:36, height:38 }} placeholder="Search by name or phone..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['table','Table'],['cards','Cards']].map(([v,l]) => (
            <button key={v} className={`btn btn-sm ${viewMode===v?'btn-primary':'btn-outline'}`} onClick={() => setViewMode(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="card">
          {loading ? <Loader /> : (
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Total Purchases</th><th>Loyalty Points</th><th>Outstanding</th><th>Actions</th></tr></thead>
                <tbody>
                  {customers.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No customers found</td></tr>
                    : customers.map((c,i) => (
                      <tr key={c._id}>
                        <td style={{ color:'var(--text-muted)', fontSize:12 }}>{(page-1)*20+i+1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#2563EB,#6366F1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:13 }}>{c.phone||'—'}</td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>{c.email||'—'}</td>
                        <td style={{ fontWeight:700, color:'var(--secondary)' }}>PKR {c.totalPurchases?.toLocaleString()||'0'}</td>
                        <td><span className="badge badge-warning"><MdStar size={10}/> {c.loyaltyPoints||0} pts</span></td>
                        <td style={{ color:c.outstandingBalance>0?'#EF4444':'var(--text-muted)' }}>{c.outstandingBalance>0?`PKR ${c.outstandingBalance.toLocaleString()}`:'—'}</td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => openEdit(c)} className="btn btn-outline btn-icon btn-sm" title="Edit"><MdEdit size={14}/></button>
                            <button onClick={() => askDelete(c)} className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444' }} title="Delete"><MdDelete size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {total > 20 && (
                <div style={{ padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)' }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)' }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</button>
                    <button className="btn btn-outline btn-sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        loading ? <Loader /> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
            {customers.map(c => (
              <div key={c._id} className="card card-hover" style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ width:46, height:46, background:'linear-gradient(135deg,#2563EB,#6366F1)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:18 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(c)} className="btn btn-outline btn-icon btn-sm"><MdEdit size={14}/></button>
                    <button onClick={() => askDelete(c)} className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444' }}><MdDelete size={14}/></button>
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{c.name}</div>
                {c.phone && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdPhone size={12}/> {c.phone}</div>}
                {c.email && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdEmail size={12}/> {c.email}</div>}
                {c.address && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><MdLocationOn size={12}/> {c.address}</div>}
                <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div style={{ padding:'8px 10px', background:'rgba(16,185,129,0.08)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'#10B981' }}>PKR {((c.totalPurchases||0)/1000).toFixed(1)}K</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>Total Spent</div>
                  </div>
                  <div style={{ padding:'8px 10px', background:'rgba(245,158,11,0.08)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'#F59E0B' }}>⭐ {c.loyaltyPoints||0}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>Points</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edit Customer' : 'Add New Customer'} maxWidth={500}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Update':'Add Customer'}</button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Full Name *</label><input {...inp('name')} placeholder="Customer full name" /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Phone</label><input {...inp('phone')} placeholder="0300-0000000" /></div>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Email</label><input {...inp('email')} type="email" placeholder="email@example.com" /></div>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Address</label><textarea {...inp('address')} rows={2} placeholder="Customer address" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Notes</label><textarea {...inp('notes')} rows={2} placeholder="Any notes..." /></div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Their purchase history will be preserved.`}
        confirmText="Yes, Delete" />
    </div>
  );
}
