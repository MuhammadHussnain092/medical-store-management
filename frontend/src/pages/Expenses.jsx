import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MdAdd, MdEdit, MdDelete, MdAttachMoney } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../utils/api';
import toast from 'react-hot-toast';

const CATS = ['electricity', 'gas', 'internet', 'rent', 'salary', 'repair', 'maintenance', 'purchase', 'miscellaneous'];
const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];
const EMPTY = { title: '', category: 'electricity', amount: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash', description: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50, ...(from && { from }), ...(to && { to }) });
      const { data } = await api.get(`/expenses?${params}`);
      setExpenses(data.data); setTotal(data.totalAmount);
    } catch { } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!form.title || !form.amount) return toast.error('Title and amount required');
    setSaving(true);
    try {
      if (editing) { await api.put(`/expenses/${editing._id}`, form); toast.success('Updated'); }
      else { await api.post('/expenses', form); toast.success('Expense added'); }
      setShowModal(false); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const askDelete = (e) => { setDeleteTarget(e); setConfirmOpen(true); };
  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/expenses/${deleteTarget._id}`); toast.success('Expense deleted'); setConfirmOpen(false); setDeleteTarget(null); fetch(); }
    catch { toast.error('Failed'); }
    finally { setDeleting(false); }
  };

  const byCategory = CATS.map((c, i) => ({
    name: c.charAt(0).toUpperCase() + c.slice(1),
    value: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
    color: COLORS[i]
  })).filter(c => c.value > 0);

  const inp = f => ({ value: form[f] || '', onChange: e => setForm({ ...form, [f]: e.target.value }), className: 'input-field' });

  return (
    <div className="fade-in">
      <PageHeader title="Expenses" subtitle="Track and manage store expenses"
        action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}><MdAdd size={18} /> Add Expense</button>} />
      <div className="dashboard-grid-charts" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" className="input-field" style={{ width: 150, height: 36 }} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
            <input type="date" className="input-field" style={{ width: 150, height: 36 }} value={to} onChange={e => setTo(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>
            <div style={{ marginLeft: 'auto', fontWeight: 800, color: '#EF4444' }}>Total: PKR {total?.toLocaleString()}</div>
          </div>
          {loading ? <Loader /> : (
            <div className="table-container" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Method</th><th>Actions</th></tr></thead>
                <tbody>
                  {expenses.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No expenses found</td></tr>
                    : expenses.map(e => (
                      <tr key={e._id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</td>
                        <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{e.category}</span></td>
                        <td style={{ fontWeight: 700, color: '#EF4444' }}>PKR {e.amount?.toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(e.date).toLocaleDateString('en-PK')}</td>
                        <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{e.paymentMethod}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditing(e); setForm({ ...e, date: new Date(e.date).toISOString().split('T')[0] }); setShowModal(true); }} className="btn btn-outline btn-icon btn-sm"><MdEdit size={13} /></button>
                          <button onClick={() => askDelete(e)} className="btn btn-icon btn-sm" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444' }}><MdDelete size={13} /></button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>By Category</h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byCategory} cx="50%" cy="45%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`PKR ${v.toLocaleString()}`, '']} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>}
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} maxWidth={500}
        footer={<><button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Title *</label><input {...inp('title')} placeholder="e.g. Monthly Electricity Bill" /></div>
          <div className="grid-responsive-2" style={{ gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Category</label>
              <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Amount (PKR) *</label><input {...inp('amount')} type="number" placeholder="0" /></div>
          </div>
          <div className="grid-responsive-2" style={{ gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Date</label><input {...inp('date')} type="date" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Payment Method</label>
              <select className="input-field" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="check">Check</option>
              </select>
            </div>
          </div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Description</label><textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional..." /></div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Expense"
        message={`Delete "${deleteTarget?.title}" of PKR ${deleteTarget?.amount?.toLocaleString()}? This cannot be undone.`}
        confirmText="Yes, Delete" />
    </div>
  );
}
