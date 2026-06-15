import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdMedication, MdWarning, MdFilterList } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name:'', genericName:'', brand:'', barcode:'', purchasePrice:'', salePrice:'', mrp:'', quantity:'', minStockLevel:10, unit:'strip', prescriptionRequired:false, notes:'', taxPercent:0, discountPercent:0 };

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...(search && { search }), ...(filter === 'lowstock' && { lowStock: true }), ...(filter === 'expiring' && { expiring: true }) });
      const { data } = await api.get(`/medicines?${params}`);
      setMedicines(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load medicines'); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, sRes] = await Promise.all([api.get('/categories'), api.get('/suppliers')]);
        setCategories(cRes.data.data);
        setSuppliers(sRes.data.data);
      } catch {}
    };
    load();
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (m) => { setEditing(m); setForm({ ...m, category: m.category?._id || '', supplier: m.supplier?._id || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.purchasePrice || !form.salePrice) return toast.error('Name and prices are required');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/medicines/${editing._id}`, form);
        toast.success('Medicine updated');
      } else {
        await api.post('/medicines', form);
        toast.success('Medicine added');
      }
      setShowModal(false);
      fetchMedicines();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving medicine'); }
    finally { setSaving(false); }
  };

  const askDelete = (id, name) => { setDeleteTarget({ id, name }); setConfirmOpen(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/medicines/${deleteTarget.id}`);
      toast.success('Medicine deleted');
      setConfirmOpen(false); setDeleteTarget(null);
      fetchMedicines();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const inp = (field) => ({ value: form[field] || '', onChange: e => setForm({...form, [field]: e.target.value}), className: 'input-field' });

  return (
    <div className="fade-in">
      <PageHeader title="Medicines" subtitle={`${total} total medicines in inventory`}
        action={<button className="btn btn-primary" onClick={openAdd}><MdAdd size={18} /> Add Medicine</button>} />

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <MdSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input placeholder="Search by name, barcode..." className="input-field" style={{ paddingLeft: 36, height: 38 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {['all','lowstock','expiring'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'} btn-sm`}>
            {f === 'all' ? 'All' : f === 'lowstock' ? '⚠️ Low Stock' : '🕐 Expiring'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? <Loader /> : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Medicine Name</th><th>Category</th><th>Barcode</th>
                <th>Purchase Price</th><th>Sale Price</th>
                <th>Stock</th><th>Expiry</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {medicines.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No medicines found</td></tr>
                ) : medicines.map(m => {
                  const isLow = m.quantity <= m.minStockLevel;
                  const daysLeft = m.expiryDate ? Math.ceil((new Date(m.expiryDate) - new Date()) / 86400000) : null;
                  return (
                    <tr key={m._id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                        {m.genericName && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.genericName}</div>}
                      </td>
                      <td><span className="badge badge-info">{m.category?.name || '—'}</span></td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{m.barcode || '—'}</td>
                      <td style={{ fontWeight: 600 }}>PKR {m.purchasePrice}</td>
                      <td style={{ fontWeight: 700, color: 'var(--secondary)' }}>PKR {m.salePrice}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: isLow ? '#EF4444' : 'var(--text)' }}>
                          {isLow && <MdWarning size={14} style={{ verticalAlign: 'middle', marginRight: 2 }} />}
                          {m.quantity} {m.unit}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {m.expiryDate ? (
                          <span style={{ color: daysLeft <= 30 ? '#F59E0B' : daysLeft <= 7 ? '#EF4444' : 'var(--text)' }}>
                            {new Date(m.expiryDate).toLocaleDateString('en-PK')}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {m.prescriptionRequired
                          ? <span className="badge badge-warning">Rx</span>
                          : <span className="badge badge-success">OTC</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(m)} className="btn btn-outline btn-icon btn-sm"><MdEdit size={15} /></button>
                          <button onClick={() => askDelete(m._id, m.name)} className="btn btn-icon btn-sm" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444' }}><MdDelete size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination */}
            {total > 15 && (
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {(page-1)*15+1}–{Math.min(page*15, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</button>
                  <button className="btn btn-outline btn-sm" disabled={page*15 >= total} onClick={() => setPage(p => p+1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Medicine' : 'Add New Medicine'} maxWidth={700}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Medicine'}</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Medicine Name *</label><input {...inp('name')} placeholder="e.g. Panadol 500mg" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Generic Name</label><input {...inp('genericName')} placeholder="e.g. Paracetamol" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Brand</label><input {...inp('brand')} placeholder="e.g. GSK" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Barcode</label><input {...inp('barcode')} placeholder="Scan or enter barcode" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Category</label>
            <select className="input-field" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Supplier</label>
            <select className="input-field" value={form.supplier || ''} onChange={e => setForm({...form, supplier: e.target.value})}>
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Purchase Price (PKR) *</label><input {...inp('purchasePrice')} type="number" placeholder="0" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Sale Price (PKR) *</label><input {...inp('salePrice')} type="number" placeholder="0" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>MRP (PKR)</label><input {...inp('mrp')} type="number" placeholder="0" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Quantity</label><input {...inp('quantity')} type="number" placeholder="0" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Min Stock Level</label><input {...inp('minStockLevel')} type="number" placeholder="10" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Unit</label>
            <select className="input-field" value={form.unit || 'strip'} onChange={e => setForm({...form, unit: e.target.value})}>
              {['strip','tablet','bottle','sachet','injection','cream','syrup','drops','capsule'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Expiry Date</label><input className="input-field" type="date" value={form.expiryDate ? new Date(form.expiryDate).toISOString().split('T')[0] : ''} onChange={e => setForm({...form, expiryDate: e.target.value})} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Batch No</label><input {...inp('batchNo')} placeholder="e.g. BT2024A" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Rack Location</label><input {...inp('rackLocation')} placeholder="e.g. A-2-3" /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24 }}>
            <input type="checkbox" id="rx" checked={form.prescriptionRequired || false} onChange={e => setForm({...form, prescriptionRequired: e.target.checked})} style={{ width: 16, height: 16 }} />
            <label htmlFor="rx" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Prescription Required (Rx)</label>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Notes</label><textarea {...inp('notes')} rows={2} placeholder="Additional notes..." style={{ resize: 'vertical' }} /></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Medicine"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Stock data will be removed.`}
        confirmText="Yes, Delete" />
    </div>
  );
}
