import React, { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdLocalShipping, MdPayment, MdVisibility,
  MdFilterList, MdClose, MdCheck, MdInventory2,
  MdReceipt, MdWarning, MdArrowDropDown
} from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ─── constants ─────────────────────────────────────────────────── */
const STATUS = {
  ordered:   { label:'Ordered',   color:'#2563EB', bg:'rgba(37,99,235,0.10)',  dot:'#2563EB' },
  received:  { label:'Received',  color:'#059669', bg:'rgba(5,150,105,0.10)',  dot:'#10B981' },
  partial:   { label:'Partial',   color:'#D97706', bg:'rgba(217,119,6,0.10)',  dot:'#F59E0B' },
  cancelled: { label:'Cancelled', color:'#DC2626', bg:'rgba(220,38,38,0.10)',  dot:'#EF4444' },
};
const PAY = {
  unpaid:  { label:'Unpaid',  color:'#DC2626', bg:'rgba(220,38,38,0.10)'  },
  partial: { label:'Partial', color:'#D97706', bg:'rgba(217,119,6,0.10)'  },
  paid:    { label:'Paid',    color:'#059669', bg:'rgba(5,150,105,0.10)'  },
};

const StatusBadge = ({ value, map }) => {
  const s = map[value] || { label: value, color:'#64748B', bg:'rgba(100,116,139,0.1)', dot:'#64748B' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20,
      background:s.bg, color:s.color, fontSize:12, fontWeight:600 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {s.label}
    </span>
  );
};

const EMPTY_FORM = {
  supplier:'', status:'ordered', notes:'',
  items:[{ medicine:'', medicineName:'', quantity:1, unitPrice:0, batchNo:'', expiryDate:'' }]
};

/* ─── component ──────────────────────────────────────────────────── */
export default function Purchases() {
  const [purchases,      setPurchases]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [suppliers,      setSuppliers]      = useState([]);
  const [medicines,      setMedicines]      = useState([]);
  const [page,           setPage]           = useState(1);
  const [total,          setTotal]          = useState(0);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');

  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);

  const [confirmOpen,    setConfirmOpen]    = useState(false);
  const [receiveTarget,  setReceiveTarget]  = useState(null);
  const [receiving,      setReceiving]      = useState(false);

  const [showPayModal,   setShowPayModal]   = useState(false);
  const [payTarget,      setPayTarget]      = useState(null);
  const [paidAmount,     setPaidAmount]     = useState('');
  const [paying,         setPaying]         = useState(false);

  const [viewPO,         setViewPO]         = useState(null);

  /* fetch */
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:15,
        ...(filterStatus   && { status:filterStatus }),
        ...(filterSupplier && { supplier:filterSupplier }),
      });
      const { data } = await api.get(`/purchases?${p}`);
      setPurchases(data.data); setTotal(data.total);
    } catch { toast.error('Failed to load purchases'); }
    finally { setLoading(false); }
  }, [page, filterStatus, filterSupplier]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  useEffect(() => {
    (async () => {
      try {
        const [sR, mR] = await Promise.all([api.get('/suppliers'), api.get('/medicines?limit=200')]);
        setSuppliers(sR.data.data); setMedicines(mR.data.data);
      } catch {}
    })();
  }, []);

  /* items */
  const addItem    = () => setForm(f => ({ ...f, items:[...f.items, { medicine:'', medicineName:'', quantity:1, unitPrice:0, batchNo:'', expiryDate:'' }] }));
  const removeItem = idx => setForm(f => ({ ...f, items:f.items.filter((_,i)=>i!==idx) }));
  const setItem    = (idx, field, val) => setForm(f => ({ ...f, items:f.items.map((it,i)=>i===idx?{...it,[field]:val}:it) }));

  const pickMedicine = (idx, id) => {
    const m = medicines.find(x => x._id === id);
    if (m) setForm(f => ({ ...f, items:f.items.map((it,i)=>i===idx?{...it, medicine:m._id, medicineName:m.name, unitPrice:m.purchasePrice||0}:it) }));
  };

  const orderTotal = () => form.items.reduce((s,i) => s + (Number(i.quantity)||0)*(Number(i.unitPrice)||0), 0);

  /* save */
  const handleSave = async () => {
    if (!form.supplier)                         return toast.error('Select a supplier');
    if (form.items.some(i => !i.medicineName))  return toast.error('All rows need a medicine');
    setSaving(true);
    try {
      const sub = orderTotal();
      await api.post('/purchases', { ...form, subtotal:sub, totalAmount:sub, dueAmount:sub });
      toast.success('Purchase order created');
      setShowModal(false); setForm(EMPTY_FORM); fetchPurchases();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  /* receive */
  const handleReceive = async () => {
    setReceiving(true);
    try {
      await api.put(`/purchases/${receiveTarget._id}/status`, { status:'received' });
      toast.success(`Stock added for ${receiveTarget.purchaseNo}`);
      setConfirmOpen(false); setReceiveTarget(null); fetchPurchases();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setReceiving(false); }
  };

  /* payment */
  const handlePayment = async () => {
    if (!paidAmount || Number(paidAmount)<=0) return toast.error('Enter valid amount');
    setPaying(true);
    try {
      await api.put(`/purchases/${payTarget._id}/status`, { paidAmount:Number(paidAmount) });
      toast.success('Payment recorded'); setShowPayModal(false); fetchPurchases();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPaying(false); }
  };

  /* derived */
  const totalValue   = purchases.reduce((s,p)=>s+(p.totalAmount||0), 0);
  const totalDue     = purchases.reduce((s,p)=>s+(p.dueAmount||0),   0);
  const totalPaid    = purchases.reduce((s,p)=>s+(p.paidAmount||0),  0);
  const pendingCount = purchases.filter(p=>p.status==='ordered').length;

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:4 }}>Purchase Orders</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>
            Manage incoming stock from suppliers — create orders, receive goods, record payments
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
          style={{ height:42, paddingInline:20, fontSize:14 }}>
          <MdAdd size={18} /> New Purchase Order
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        {[
          { label:'Total Orders',     value:total,                                  sub:`${pendingCount} pending arrival`, icon:'📋', accent:'#2563EB' },
          { label:'Total Value',      value:`PKR ${totalValue.toLocaleString()}`,   sub:'all orders combined',            icon:'💰', accent:'#6366F1' },
          { label:'Amount Paid',      value:`PKR ${totalPaid.toLocaleString()}`,    sub:'payments recorded',              icon:'✅', accent:'#10B981' },
          { label:'Outstanding Due',  value:`PKR ${totalDue.toLocaleString()}`,     sub:'owed to suppliers',              icon:'⚠️', accent:totalDue>0?'#EF4444':'#10B981' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:'20px 22px', display:'flex', gap:16, alignItems:'center', overflow:'hidden', position:'relative' }}>
            <div style={{ width:48, height:48, borderRadius:14, background:`${k.accent}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {k.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:19, fontWeight:800, color:k.accent, lineHeight:1.1 }}>{k.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending banner ── */}
      {pendingCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px',
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <MdLocalShipping size={20} style={{ color:'#F59E0B', flexShrink:0 }} />
            <span style={{ fontSize:14, fontWeight:600, color:'#92400E' }}>
              {pendingCount} order{pendingCount>1?'s':''} waiting to be received — click <strong>"Receive"</strong> when goods arrive to update inventory automatically.
            </span>
          </div>
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="card" style={{ padding:'14px 18px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:5 }}>
          <MdFilterList size={16}/> Filters
        </span>
        <div style={{ width:1, height:22, background:'var(--border)' }} />
        <select className="input-field" style={{ width:170, height:36, fontSize:13 }}
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input-field" style={{ width:210, height:36, fontSize:13 }}
          value={filterSupplier} onChange={e => { setFilterSupplier(e.target.value); setPage(1); }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {(filterStatus || filterSupplier) && (
          <button className="btn btn-outline btn-sm" style={{ height:36 }}
            onClick={() => { setFilterStatus(''); setFilterSupplier(''); setPage(1); }}>
            <MdClose size={14}/> Clear
          </button>
        )}
        <div style={{ marginLeft:'auto', fontSize:13, color:'var(--text-muted)' }}>
          {total} order{total!==1?'s':''} found
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ overflow:'hidden' }}>
        {loading ? <Loader /> : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
                <thead>
                  <tr style={{ background:'var(--bg)' }}>
                    {['PO Number','Supplier','Items','Order Total','Paid','Due','Stock Status','Payment','Date','Actions'].map(h => (
                      <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                        color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px',
                        borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding:60, textAlign:'center' }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, color:'var(--text-muted)' }}>
                          <MdReceipt size={48} style={{ opacity:0.2 }} />
                          <div>
                            <p style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>No purchase orders found</p>
                            <p style={{ fontSize:13 }}>Create your first order to start tracking stock</p>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}>
                            <MdAdd size={14}/> Create Purchase Order
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : purchases.map((po, idx) => (
                    <tr key={po._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(37,99,235,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                      {/* PO Number */}
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'var(--primary)' }}>{po.purchaseNo}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{po.items?.length} line{po.items?.length!==1?'s':''}</div>
                      </td>

                      {/* Supplier */}
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#2563EB,#6366F1)',
                            display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:13, flexShrink:0 }}>
                            {po.supplier?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{po.supplier?.name || '—'}</div>
                            {po.supplier?.phone && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{po.supplier.phone}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Items count */}
                      <td style={{ padding:'14px 16px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20,
                          background:'rgba(37,99,235,0.08)', color:'#2563EB', fontSize:12, fontWeight:600 }}>
                          <MdInventory2 size={11}/> {po.items?.length || 0}
                        </span>
                      </td>

                      {/* Total */}
                      <td style={{ padding:'14px 16px', fontWeight:700, fontSize:14, color:'var(--text)' }}>
                        PKR {po.totalAmount?.toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td style={{ padding:'14px 16px', fontWeight:600, fontSize:13, color:'#059669' }}>
                        PKR {(po.paidAmount||0).toLocaleString()}
                      </td>

                      {/* Due */}
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:po.dueAmount>0?'#DC2626':'#059669' }}>
                          PKR {(po.dueAmount||0).toLocaleString()}
                        </div>
                      </td>

                      {/* Stock status */}
                      <td style={{ padding:'14px 16px' }}>
                        <StatusBadge value={po.status} map={STATUS} />
                      </td>

                      {/* Payment status */}
                      <td style={{ padding:'14px 16px' }}>
                        <StatusBadge value={po.paymentStatus||'unpaid'} map={PAY} />
                      </td>

                      {/* Date */}
                      <td style={{ padding:'14px 16px', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {new Date(po.createdAt).toLocaleDateString('en-PK',{ day:'numeric', month:'short', year:'numeric' })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>

                          {/* Receive Stock */}
                          {(po.status==='ordered'||po.status==='partial') && (
                            <button onClick={() => { setReceiveTarget(po); setConfirmOpen(true); }}
                              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
                                background:'rgba(5,150,105,0.12)', border:'1px solid rgba(5,150,105,0.3)',
                                borderRadius:8, color:'#059669', cursor:'pointer', fontSize:12, fontWeight:700,
                                whiteSpace:'nowrap', transition:'all 0.15s' }}
                              onMouseEnter={e=>{e.currentTarget.style.background='rgba(5,150,105,0.22)';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='rgba(5,150,105,0.12)';}}>
                              <MdLocalShipping size={13}/> Receive
                            </button>
                          )}

                          {/* Pay */}
                          {po.dueAmount>0 && (
                            <button onClick={() => { setPayTarget(po); setPaidAmount(String(po.dueAmount||'')); setShowPayModal(true); }}
                              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px',
                                background:'rgba(37,99,235,0.10)', border:'1px solid rgba(37,99,235,0.25)',
                                borderRadius:8, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:700,
                                whiteSpace:'nowrap', transition:'all 0.15s' }}
                              onMouseEnter={e=>{e.currentTarget.style.background='rgba(37,99,235,0.20)';}}
                              onMouseLeave={e=>{e.currentTarget.style.background='rgba(37,99,235,0.10)';}}>
                              <MdPayment size={13}/> Pay
                            </button>
                          )}

                          {/* View */}
                          <button onClick={() => setViewPO(po)}
                            style={{ width:30, height:30, display:'inline-flex', alignItems:'center', justifyContent:'center',
                              background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8,
                              cursor:'pointer', color:'var(--text-muted)', transition:'all 0.15s' }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)';e.currentTarget.style.color='var(--primary)';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-muted)';}}>
                            <MdVisibility size={15}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 15 && (
              <div style={{ padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center',
                borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                  Showing <strong>{(page-1)*15+1}</strong>–<strong>{Math.min(page*15,total)}</strong> of <strong>{total}</strong> orders
                </span>
                <div style={{ display:'flex', gap:6 }}>
                  {[...Array(Math.ceil(total/15))].map((_,i) => (
                    <button key={i} onClick={() => setPage(i+1)}
                      style={{ width:32, height:32, borderRadius:8, border:'1px solid',
                        borderColor: page===i+1 ? 'var(--primary)' : 'var(--border)',
                        background: page===i+1 ? 'var(--primary)' : 'transparent',
                        color: page===i+1 ? 'white' : 'var(--text-muted)',
                        cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      {i+1}
                    </button>
                  )).slice(Math.max(0,page-3), page+2)}
                  {Math.ceil(total/15) > page+2 && <span style={{ alignSelf:'center', color:'var(--text-muted)' }}>…</span>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════
          NEW PURCHASE ORDER MODAL
      ══════════════════════════════════════════ */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title="New Purchase Order" maxWidth={860}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth:160 }}>
            {saving ? '⏳ Creating...' : <><MdCheck size={16}/> Create Order — PKR {orderTotal().toLocaleString()}</>}
          </button>
        </>}>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Supplier + Status */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>Supplier *</label>
              <select className="input-field" value={form.supplier} onChange={e => setForm({...form, supplier:e.target.value})} style={{ height:42 }}>
                <option value="">— Select supplier —</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}{s.phone?` (${s.phone})`:''}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>Initial Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({...form, status:e.target.value})} style={{ height:42 }}>
                <option value="ordered">Ordered — stock not yet arrived</option>
                <option value="received">Received — stock already in hand</option>
              </select>
            </div>
          </div>

          {/* Items table */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Medicine Items ({form.items.length})
              </label>
              <button className="btn btn-outline btn-sm" onClick={addItem} style={{ height:32 }}>
                <MdAdd size={14}/> Add Row
              </button>
            </div>

            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'2.5fr 0.7fr 1fr 1fr 1fr 36px', gap:8, padding:'8px 10px',
              background:'var(--bg)', borderRadius:'10px 10px 0 0', border:'1px solid var(--border)', borderBottom:'none' }}>
              {['Medicine','Qty','Purchase Price (PKR)','Batch No','Expiry Date',''].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ border:'1px solid var(--border)', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
              {form.items.map((item, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'2.5fr 0.7fr 1fr 1fr 1fr 36px', gap:8, padding:'10px',
                  borderBottom: idx<form.items.length-1 ? '1px solid var(--border)' : 'none',
                  background: idx%2===0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                  <select className="input-field" style={{ height:36, fontSize:13 }}
                    value={item.medicine||''} onChange={e => pickMedicine(idx, e.target.value)}>
                    <option value="">Select medicine…</option>
                    {medicines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                  <input className="input-field" style={{ height:36, fontSize:13 }} type="number" min={1}
                    value={item.quantity} onChange={e => setItem(idx,'quantity',e.target.value)} />
                  <input className="input-field" style={{ height:36, fontSize:13 }} type="number" min={0}
                    value={item.unitPrice} onChange={e => setItem(idx,'unitPrice',e.target.value)} />
                  <input className="input-field" style={{ height:36, fontSize:13 }}
                    placeholder="e.g. BT2025A" value={item.batchNo} onChange={e => setItem(idx,'batchNo',e.target.value)} />
                  <input className="input-field" style={{ height:36, fontSize:13 }} type="date"
                    value={item.expiryDate} onChange={e => setItem(idx,'expiryDate',e.target.value)} />
                  <button onClick={() => removeItem(idx)} disabled={form.items.length===1}
                    style={{ height:36, width:36, border:'none', borderRadius:8, cursor:form.items.length===1?'not-allowed':'pointer',
                      background: form.items.length===1 ? 'transparent':'rgba(239,68,68,0.1)', color:'#EF4444',
                      fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity:form.items.length===1?0.3:1 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total + received notice */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            {form.status==='received' && (
              <div style={{ flex:1, padding:'12px 16px', background:'rgba(5,150,105,0.08)', border:'1px solid rgba(5,150,105,0.25)', borderRadius:12 }}>
                <span style={{ fontSize:13, color:'#065F46', fontWeight:600 }}>
                  ✅ Status is "Received" — inventory quantities will update <strong>automatically</strong> on save.
                </span>
              </div>
            )}
            <div style={{ marginLeft:'auto', padding:'14px 22px', background:'var(--bg)', border:'2px solid var(--border)', borderRadius:12, textAlign:'right', minWidth:200 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Order Total</div>
              <div style={{ fontSize:22, fontWeight:900, color:'var(--primary)' }}>PKR {orderTotal().toLocaleString()}</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>Notes</label>
            <textarea className="input-field" rows={2} value={form.notes}
              onChange={e => setForm({...form, notes:e.target.value})} placeholder="Optional notes about this order…" />
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════
          RECEIVE STOCK CONFIRM
      ══════════════════════════════════════════ */}
      <ConfirmDialog isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setReceiveTarget(null); }}
        onConfirm={handleReceive} loading={receiving}
        confirmText="Confirm Receipt" confirmColor="#059669"
        title="Confirm Stock Receipt"
        message={receiveTarget
          ? `Marking PO ${receiveTarget.purchaseNo} as received will add these quantities to your inventory:\n\n${receiveTarget.items?.map(i=>`• ${i.medicineName} — +${i.quantity} units`).join('\n')}\n\nThis cannot be reversed.`
          : ''} />

      {/* ══════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════ */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" maxWidth={440}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePayment} disabled={paying} style={{ minWidth:140 }}>
            {paying ? 'Saving…' : <><MdCheck size={15}/> Record Payment</>}
          </button>
        </>}>
        {payTarget && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* PO summary */}
            <div style={{ padding:'14px 18px', background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{payTarget.purchaseNo}</span>
                <StatusBadge value={payTarget.paymentStatus||'unpaid'} map={PAY} />
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:2 }}>Supplier: {payTarget.supplier?.name}</div>
              <div style={{ display:'flex', gap:20, marginTop:10 }}>
                <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Order Total</div><div style={{ fontWeight:700 }}>PKR {payTarget.totalAmount?.toLocaleString()}</div></div>
                <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Paid So Far</div><div style={{ fontWeight:700, color:'#059669' }}>PKR {(payTarget.paidAmount||0).toLocaleString()}</div></div>
                <div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Remaining Due</div><div style={{ fontWeight:800, color:'#DC2626', fontSize:15 }}>PKR {payTarget.dueAmount?.toLocaleString()}</div></div>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>Amount to Pay (PKR)</label>
              <input className="input-field" type="number" min={1} max={payTarget.dueAmount}
                value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
                placeholder="Enter amount…" style={{ fontSize:20, fontWeight:800, height:54 }} />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={() => setPaidAmount(String(payTarget.dueAmount))}
                  style={{ flex:1, padding:'7px 0', background:'rgba(5,150,105,0.1)', border:'1px solid rgba(5,150,105,0.25)', borderRadius:8, color:'#059669', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  Full Amount (PKR {payTarget.dueAmount?.toLocaleString()})
                </button>
                <button onClick={() => setPaidAmount(String(Math.round(payTarget.dueAmount/2)))}
                  style={{ flex:1, padding:'7px 0', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, color:'#2563EB', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                  Half Amount
                </button>
              </div>
            </div>

            {paidAmount && (
              <div style={{ padding:'10px 14px', background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.2)', borderRadius:10 }}>
                <span style={{ fontSize:13, color:'#065F46', fontWeight:600 }}>
                  After this payment: <strong>PKR {Math.max(0, (payTarget.dueAmount||0)-Number(paidAmount)).toLocaleString()}</strong> will remain due.
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════
          VIEW PO DETAIL MODAL
      ══════════════════════════════════════════ */}
      <Modal isOpen={!!viewPO} onClose={() => setViewPO(null)}
        title={viewPO ? `Purchase Order — ${viewPO.purchaseNo}` : ''} maxWidth={640}>
        {viewPO && (
          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Meta grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                ['Supplier',        viewPO.supplier?.name || '—'],
                ['Date',            new Date(viewPO.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'long',year:'numeric'})],
                ['Created By',      viewPO.createdBy?.name || '—'],
                ['Stock Status',    null, <StatusBadge value={viewPO.status} map={STATUS}/>],
                ['Payment Status',  null, <StatusBadge value={viewPO.paymentStatus||'unpaid'} map={PAY}/>],
                ['Notes',           viewPO.notes || '—'],
              ].map(([k, v, el]) => (
                <div key={k} style={{ padding:'10px 14px', background:'var(--bg)', borderRadius:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>{k}</div>
                  {el || <div style={{ fontWeight:600, fontSize:13 }}>{v}</div>}
                </div>
              ))}
            </div>

            {/* Financials */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                ['Order Total', `PKR ${viewPO.totalAmount?.toLocaleString()}`, '#6366F1'],
                ['Amount Paid', `PKR ${(viewPO.paidAmount||0).toLocaleString()}`, '#059669'],
                ['Balance Due', `PKR ${(viewPO.dueAmount||0).toLocaleString()}`, viewPO.dueAmount>0?'#DC2626':'#059669'],
              ].map(([k,v,c]) => (
                <div key={k} style={{ padding:'14px', background:'var(--bg)', borderRadius:12, textAlign:'center', border:`1px solid ${c}22` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{k}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Items */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Order Lines</div>
              <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg)' }}>
                      {['Medicine','Qty','Unit Price','Batch','Expiry','Line Total'].map(h => (
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:700,
                          color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px',
                          borderBottom:'1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewPO.items?.map((item, i) => (
                      <tr key={i} style={{ borderBottom: i<viewPO.items.length-1?'1px solid var(--border)':'none' }}>
                        <td style={{ padding:'11px 14px', fontWeight:600, fontSize:13 }}>{item.medicineName}</td>
                        <td style={{ padding:'11px 14px', fontSize:13 }}>{item.quantity}</td>
                        <td style={{ padding:'11px 14px', fontSize:13 }}>PKR {item.unitPrice?.toLocaleString()}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{item.batchNo||'—'}</td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>
                          {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                        </td>
                        <td style={{ padding:'11px 14px', fontWeight:700, color:'var(--primary)' }}>
                          PKR {((item.quantity||0)*(item.unitPrice||0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'var(--bg)' }}>
                      <td colSpan={5} style={{ padding:'11px 14px', fontWeight:700, fontSize:13, borderTop:'2px solid var(--border)' }}>Total</td>
                      <td style={{ padding:'11px 14px', fontWeight:900, fontSize:15, color:'var(--primary)', borderTop:'2px solid var(--border)' }}>
                        PKR {viewPO.totalAmount?.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
