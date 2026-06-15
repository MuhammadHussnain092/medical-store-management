import React, { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdEdit, MdDelete, MdSearch, MdPhone, MdEmail,
  MdBusiness, MdArrowBack, MdPayment, MdReceipt,
  MdTrendingUp, MdAccountBalance, MdWarning
} from 'react-icons/md';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name:'', company:'', email:'', phone:'', address:'', city:'', creditLimit:0, notes:'' };
const EMPTY_PAY  = { amount:'', paymentMethod:'cash', reference:'', note:'' };

export default function Suppliers() {
  // List state
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  // Add/Edit modal
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);

  // Ledger state
  const [view,        setView]        = useState('list'); // 'list' | 'ledger'
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [ledger,      setLedger]      = useState(null);
  const [ledgerLoading,setLedgerLoading] = useState(false);
  const [ledgerFrom,  setLedgerFrom]  = useState('');
  const [ledgerTo,    setLedgerTo]    = useState('');

  // Payment modal
  const [showPayModal,setShowPayModal]= useState(false);
  const [payForm,     setPayForm]     = useState(EMPTY_PAY);
  const [paying,      setPaying]      = useState(false);

  // ── Fetch suppliers ──
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/suppliers?search=${search}`);
      setSuppliers(data.data);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  // ── Fetch ledger ──
  const fetchLedger = useCallback(async (supplierId, from = '', to = '') => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams({ ...(from && { from }), ...(to && { to }) });
      const { data } = await api.get(`/suppliers/${supplierId}/ledger?${params}`);
      setLedger(data.data);
    } catch { toast.error('Failed to load ledger'); }
    finally { setLedgerLoading(false); }
  }, []);

  const openLedger = (supplier) => {
    setActiveSupplier(supplier);
    setView('ledger');
    fetchLedger(supplier._id);
  };

  // ── Save supplier ──
  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/suppliers/${editing._id}`, form);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  // ── Delete supplier ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/suppliers/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} deleted`);
      setConfirmOpen(false); setDeleteTarget(null);
      fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setDeleting(false); }
  };

  // ── Record payment ──
  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter valid amount');
    setPaying(true);
    try {
      const { data } = await api.post(`/suppliers/${activeSupplier._id}/payment`, payForm);
      toast.success(data.message);
      setShowPayModal(false);
      setPayForm(EMPTY_PAY);
      fetchLedger(activeSupplier._id, ledgerFrom, ledgerTo);
      // Also refresh supplier list outstanding balance
      fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPaying(false); }
  };

  const inp      = f => ({ value: form[f]||'',    onChange: e => setForm({...form, [f]: e.target.value}),    className:'input-field' });
  const payInp   = f => ({ value: payForm[f]||'', onChange: e => setPayForm({...payForm, [f]: e.target.value}), className:'input-field' });

  const totalOutstanding = suppliers.reduce((s, sup) => s + (sup.outstandingBalance||0), 0);

  // ════════════════════════════════════════
  // ── LEDGER VIEW ──
  // ════════════════════════════════════════
  if (view === 'ledger' && activeSupplier) {
    const s   = ledger?.summary || {};
    const entries = ledger?.entries || [];

    // Build monthly chart data from entries
    const monthlyMap = {};
    entries.forEach(e => {
      const key = new Date(e.date).toLocaleDateString('en-PK', { month:'short', year:'2-digit' });
      if (!monthlyMap[key]) monthlyMap[key] = { month:key, purchases:0, payments:0 };
      monthlyMap[key].purchases += e.debit;
      monthlyMap[key].payments  += e.credit;
    });
    const chartData = Object.values(monthlyMap).slice(-6);

    return (
      <div className="fade-in">
        {/* Back + Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setView('list'); setLedger(null); }}>
            <MdArrowBack size={16} /> Back to Suppliers
          </button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>
              📒 Supplier Ledger — {activeSupplier.name}
            </h1>
            <p style={{ fontSize:13, color:'var(--text-muted)' }}>
              {activeSupplier.company && `${activeSupplier.company} • `}
              {activeSupplier.phone} {activeSupplier.city && `• ${activeSupplier.city}`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
            <MdPayment size={16} /> Record Payment
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
          {[
            { label:'Total Purchases',  value:`PKR ${(s.totalPurchases||0).toLocaleString()}`,  color:'#EF4444', icon:'🛒', bg:'rgba(239,68,68,0.08)' },
            { label:'Total Paid',       value:`PKR ${(s.totalPaid||0).toLocaleString()}`,        color:'#10B981', icon:'✅', bg:'rgba(16,185,129,0.08)' },
            { label:'Outstanding',      value:`PKR ${(s.outstanding||0).toLocaleString()}`,      color: s.outstanding>0?'#F59E0B':'#10B981', icon:'⚠️', bg:'rgba(245,158,11,0.08)' },
            { label:'Total Orders',     value:s.purchaseCount||0,                                color:'#2563EB', icon:'📦', bg:'rgba(37,99,235,0.08)' },
            { label:'Total Payments',   value:s.paymentCount||0,                                 color:'#6366F1', icon:'💳', bg:'rgba(99,102,241,0.08)' },
          ].map(card => (
            <div key={card.label} className="card" style={{ padding:18, background:card.bg, border:`1px solid ${card.color}22` }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{card.icon}</div>
              <div style={{ fontSize:20, fontWeight:800, color:card.color }}>{card.value}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Outstanding Alert */}
        {s.outstanding > 0 && (
          <div style={{ marginBottom:20, padding:'14px 18px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <MdWarning size={20} style={{ color:'#F59E0B', flexShrink:0 }} />
              <span style={{ fontSize:14, fontWeight:600, color:'#92400E' }}>
                You owe <strong>PKR {s.outstanding?.toLocaleString()}</strong> to {activeSupplier.name}
              </span>
            </div>
            <button className="btn btn-sm" style={{ background:'#F59E0B', color:'white', border:'none' }} onClick={() => setShowPayModal(true)}>
              Pay Now
            </button>
          </div>
        )}

        {/* Date filter */}
        <div className="card" style={{ padding:14, marginBottom:20, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)' }}>Filter by date:</span>
          <input type="date" className="input-field" style={{ width:160, height:36 }} value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} />
          <span style={{ color:'var(--text-muted)', fontSize:13 }}>to</span>
          <input type="date" className="input-field" style={{ width:160, height:36 }} value={ledgerTo}   onChange={e => setLedgerTo(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => fetchLedger(activeSupplier._id, ledgerFrom, ledgerTo)}>Apply</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setLedgerFrom(''); setLedgerTo(''); fetchLedger(activeSupplier._id); }}>Clear</button>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ padding:24, marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>📊 Monthly Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v, name) => [`PKR ${v.toLocaleString()}`, name === 'purchases' ? 'Purchases' : 'Payments']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }} />
                <Bar dataKey="purchases" fill="#EF4444" radius={[4,4,0,0]} name="purchases" />
                <Bar dataKey="payments"  fill="#10B981" radius={[4,4,0,0]} name="payments"  />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}><div style={{ width:12, height:12, background:'#EF4444', borderRadius:3 }} /> Purchases</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}><div style={{ width:12, height:12, background:'#10B981', borderRadius:3 }} /> Payments</div>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        <div className="card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:15 }}>📒 Transaction Ledger</span>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{entries.length} transactions</span>
          </div>
          {ledgerLoading ? <Loader /> : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width:110 }}>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign:'right' }}>Debit (Purchases)</th>
                    <th style={{ textAlign:'right' }}>Credit (Payments)</th>
                    <th style={{ textAlign:'right' }}>Balance</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                      No transactions found for this period
                    </td></tr>
                  ) : entries.map((e, idx) => (
                    <tr key={`${e._id}-${idx}`}>
                      <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {new Date(e.date).toLocaleDateString('en-PK')}
                      </td>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13 }}>{e.description}</div>
                        {e.note && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{e.note}</div>}
                        {e.paidBy && <div style={{ fontSize:11, color:'var(--text-muted)' }}>by {e.paidBy}</div>}
                        {e.status && <span className={`badge ${e.status==='received'?'badge-success':e.status==='ordered'?'badge-info':'badge-warning'}`} style={{ fontSize:10, marginTop:2 }}>{e.status}</span>}
                      </td>
                      <td style={{ textAlign:'right', fontWeight:600, color: e.debit>0 ? '#EF4444' : 'var(--text-muted)' }}>
                        {e.debit > 0 ? `PKR ${e.debit.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontWeight:600, color: e.credit>0 ? '#10B981' : 'var(--text-muted)' }}>
                        {e.credit > 0 ? `PKR ${e.credit.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontWeight:800, color: e.balance > 0 ? '#F59E0B' : '#10B981', fontSize:14 }}>
                        PKR {Math.abs(e.balance).toLocaleString()}
                        <div style={{ fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
                          {e.balance > 0 ? 'We owe' : e.balance < 0 ? 'Overpaid' : 'Clear'}
                        </div>
                      </td>
                      <td>
                        {e.type === 'purchase'
                          ? <span className="badge badge-danger"  style={{ fontSize:10 }}>🛒 Purchase</span>
                          : <span className="badge badge-success" style={{ fontSize:10 }}>💳 Payment</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {entries.length > 0 && (
                  <tfoot>
                    <tr style={{ background:'var(--bg)', fontWeight:800 }}>
                      <td colSpan={2} style={{ padding:'12px 16px', fontSize:13 }}>TOTAL</td>
                      <td style={{ textAlign:'right', padding:'12px 16px', color:'#EF4444', fontSize:14 }}>PKR {s.totalPurchases?.toLocaleString()}</td>
                      <td style={{ textAlign:'right', padding:'12px 16px', color:'#10B981', fontSize:14 }}>PKR {s.totalPaid?.toLocaleString()}</td>
                      <td style={{ textAlign:'right', padding:'12px 16px', color: s.outstanding>0?'#F59E0B':'#10B981', fontSize:15 }}>
                        PKR {s.outstanding?.toLocaleString()}
                        <div style={{ fontSize:10, fontWeight:500, color:'var(--text-muted)' }}>
                          {s.outstanding > 0 ? 'Still owed' : 'All clear'}
                        </div>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Payment Modal */}
        <Modal isOpen={showPayModal} onClose={() => { setShowPayModal(false); setPayForm(EMPTY_PAY); }}
          title={`💳 Record Payment — ${activeSupplier.name}`} maxWidth={460}
          footer={<>
            <button className="btn btn-outline" onClick={() => { setShowPayModal(false); setPayForm(EMPTY_PAY); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePayment} disabled={paying}>{paying ? 'Saving...' : 'Record Payment'}</button>
          </>}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {s.outstanding > 0 && (
              <div style={{ padding:'12px 16px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#92400E' }}>
                  Outstanding balance: <strong>PKR {s.outstanding?.toLocaleString()}</strong>
                </span>
              </div>
            )}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Amount (PKR) *</label>
              <input {...payInp('amount')} type="number" min={1} placeholder="Enter payment amount..."
                style={{ fontSize:18, fontWeight:700, height:50 }} />
              {s.outstanding > 0 && (
                <button onClick={() => setPayForm({...payForm, amount: String(s.outstanding)})}
                  style={{ marginTop:6, fontSize:11, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:600 }}>
                  Pay full outstanding (PKR {s.outstanding?.toLocaleString()})
                </button>
              )}
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Payment Method</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {['cash','bank','check'].map(m => (
                  <button key={m} onClick={() => setPayForm({...payForm, paymentMethod:m})}
                    className={`btn btn-sm ${payForm.paymentMethod===m?'btn-primary':'btn-outline'}`}
                    style={{ justifyContent:'center', textTransform:'capitalize' }}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Reference / Cheque No</label>
              <input {...payInp('reference')} placeholder="Optional reference number" />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Note</label>
              <textarea {...payInp('note')} className="input-field" rows={2} placeholder="Optional note..." />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  return (
    <div className="fade-in">
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} suppliers`}
        action={<button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }}><MdAdd size={18} /> Add Supplier</button>} />

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:20 }}>
        {[
          { label:'Total Suppliers',  value:suppliers.length,                    color:'#2563EB', icon:'🏭' },
          { label:'Total Outstanding',value:`PKR ${totalOutstanding.toLocaleString()}`, color:'#EF4444', icon:'💰' },
          { label:'Fully Paid',       value:suppliers.filter(s=>!s.outstandingBalance).length, color:'#10B981', icon:'✅' },
          { label:'Have Balance',     value:suppliers.filter(s=>s.outstandingBalance>0).length, color:'#F59E0B', icon:'⚠️' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:18 }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ padding:14, marginBottom:20 }}>
        <div style={{ position:'relative', maxWidth:400 }}>
          <MdSearch size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input className="input-field" style={{ paddingLeft:36, height:38 }} placeholder="Search by name, company, phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Supplier Cards */}
      {loading ? <Loader /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {suppliers.length === 0 ? (
            <div className="card" style={{ gridColumn:'1/-1', padding:48, textAlign:'center', color:'var(--text-muted)' }}>
              <MdBusiness size={48} style={{ opacity:0.2, marginBottom:12 }} />
              <p>No suppliers found. Add your first supplier.</p>
            </div>
          ) : suppliers.map(s => (
            <div key={s._id} className="card" style={{ padding:22, transition:'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ width:46, height:46, background:'linear-gradient(135deg,#2563EB,#6366F1)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:20 }}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => { setEditing(s); setForm(s); setShowModal(true); }} className="btn btn-outline btn-icon btn-sm" title="Edit"><MdEdit size={14}/></button>
                  <button onClick={() => { setDeleteTarget(s); setConfirmOpen(true); }} className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444' }} title="Delete"><MdDelete size={14}/></button>
                </div>
              </div>

              <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{s.name}</div>
              {s.company && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}><MdBusiness size={12}/> {s.company}</div>}
              <div style={{ fontSize:12, display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdPhone size={12} style={{ color:'var(--primary)' }}/> {s.phone}</div>
              {s.email && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdEmail size={12}/> {s.email}</div>}
              {s.city && <div style={{ fontSize:12, color:'var(--text-muted)' }}>📍 {s.city}</div>}

              {/* Balance row */}
              <div style={{ marginTop:14, padding:'10px 12px', background: s.outstandingBalance>0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center', border: s.outstandingBalance>0 ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(16,185,129,0.15)' }}>
                <span style={{ fontSize:12, fontWeight:600, color: s.outstandingBalance>0 ? '#DC2626' : '#059669' }}>
                  {s.outstandingBalance>0 ? '⚠️ Outstanding' : '✅ Clear'}
                </span>
                <span style={{ fontSize:13, fontWeight:800, color: s.outstandingBalance>0 ? '#DC2626' : '#059669' }}>
                  PKR {(s.outstandingBalance||0).toLocaleString()}
                </span>
              </div>

              {/* View Ledger button */}
              <button onClick={() => openLedger(s)} className="btn btn-outline btn-sm"
                style={{ width:'100%', marginTop:12, justifyContent:'center', gap:6 }}>
                <MdAccountBalance size={14}/> View Full Ledger
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edit Supplier' : 'Add New Supplier'} maxWidth={580}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Supplier'}</button>
        </>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[['name','Supplier Name *'],['company','Company'],['phone','Phone *'],['email','Email'],['city','City']].map(([f,l]) => (
            <div key={f}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{l}</label><input {...inp(f)} placeholder={l.replace(' *','')} /></div>
          ))}
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Credit Limit (PKR)</label><input {...inp('creditLimit')} type="number" min={0} placeholder="0" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Address</label><textarea {...inp('address')} className="input-field" rows={2} placeholder="Full address" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Notes</label><textarea {...inp('notes')} className="input-field" rows={2} placeholder="Any notes..." /></div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete} loading={deleting}
        title="Delete Supplier"
        message={`Delete "${deleteTarget?.name}"? Their purchase history will remain but the supplier will be removed.`}
        confirmText="Yes, Delete" />
    </div>
  );
}
