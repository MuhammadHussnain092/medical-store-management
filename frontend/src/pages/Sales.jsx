import React, { useState, useEffect, useCallback } from 'react';
import {
  MdCancel, MdAssignmentReturn, MdFilterList,
  MdClose, MdTimer, MdReceipt, MdWarning, MdVisibility,
  MdCheckBox, MdCheckBoxOutlineBlank
} from 'react-icons/md';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── constants ───────────────────────────────────────────────────── */
const STATUS_MAP = {
  completed: { label:'Completed', color:'#059669', bg:'rgba(5,150,105,0.10)',  dot:'#10B981' },
  cancelled: { label:'Cancelled', color:'#DC2626', bg:'rgba(220,38,38,0.10)',  dot:'#EF4444' },
  refunded:  { label:'Refunded',  color:'#7C3AED', bg:'rgba(124,58,237,0.10)', dot:'#8B5CF6' },
  held:      { label:'On Hold',   color:'#D97706', bg:'rgba(217,119,6,0.10)',  dot:'#F59E0B' },
};
const PAY_LABELS = { cash:'💵 Cash', card:'💳 Card', online:'📱 Online', split:'🔀 Split' };

const RETURN_REASONS = [
  'Wrong medicine given',
  'Customer changed mind',
  'Medicine expired at purchase',
  'Damaged packaging',
  'Doctor changed prescription',
  'Duplicate purchase',
  'Allergic reaction',
  'Other (type below)',
];

const Pill = ({ value, map }) => {
  const s = map[value] || { label:value, color:'#64748B', bg:'rgba(100,116,139,0.1)', dot:'#94A3B8' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, background:s.bg, color:s.color, fontSize:12, fontWeight:600 }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:s.dot,flexShrink:0 }}/>
      {s.label}
    </span>
  );
};

/* live countdown timer */
const Countdown = ({ createdAt }) => {
  const calc = () => {
    const left = 3*60*60*1000 - (Date.now() - new Date(createdAt).getTime());
    if (left <= 0) return null;
    const m = Math.floor((left%3600000)/60000);
    const s = Math.floor((left%60000)/1000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const iv = setInterval(() => setT(calc()), 1000); return () => clearInterval(iv); });
  if (!t) return null;
  return <span style={{ fontSize:11, color:'#D97706', fontWeight:700, display:'inline-flex', alignItems:'center', gap:3 }}><MdTimer size={11}/>{t} left</span>;
};

/* ── component ───────────────────────────────────────────────────── */
export default function Sales() {
  const [sales,        setSales]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [page,         setPage]        = useState(1);
  const [total,        setTotal]       = useState(0);
  const [search,       setSearch]      = useState('');
  const [from,         setFrom]        = useState('');
  const [to,           setTo]          = useState('');
  const [statusFilt,   setStatusFilt]  = useState('');
  const [tab,          setTab]         = useState('sales');

  /* cancel */
  const [showCancel,   setShowCancel]  = useState(false);
  const [cancelTarget, setCancelTarget]= useState(null);
  const [cancelForm,   setCancelForm]  = useState({ refundMethod:'cash', notes:'' });
  const [cancelling,   setCancelling]  = useState(false);

  /* return */
  const [showReturn,   setShowReturn]  = useState(false);
  const [returnSale,   setReturnSale]  = useState(null);
  const [returnItems,  setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod]= useState('cash');
  const [returnNote,   setReturnNote]  = useState('');
  const [returning,    setReturning]   = useState(false);

  /* returns list */
  const [returns,      setReturns]     = useState([]);
  const [retLoading,   setRetLoading]  = useState(false);
  const [viewSale,     setViewSale]    = useState(null);

  /* fetch */
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit:15,
        ...(from && {from}), ...(to && {to}),
        ...(statusFilt && {status:statusFilt}) });
      const { data } = await api.get(`/sales?${p}`);
      setSales(data.data || []); setTotal(data.total || 0);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  }, [page, from, to, statusFilt]);

  const fetchReturns = useCallback(async () => {
    setRetLoading(true);
    try { const { data } = await api.get('/returns?limit=50'); setReturns(data.data || []); }
    catch {} finally { setRetLoading(false); }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { if (tab==='returns') fetchReturns(); }, [tab, fetchReturns]);

  const canCancel = (sale) =>
    sale.status === 'completed' &&
    Date.now() - new Date(sale.createdAt).getTime() <= 3*60*60*1000;

  /* ── CANCEL ──────────────────────────────────────────────────── */
  const openCancel = (sale) => {
    setCancelTarget(sale);
    setCancelForm({ refundMethod:'cash', notes:'' });
    setShowCancel(true);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { data } = await api.post(`/returns/cancel/${cancelTarget._id}`, cancelForm);
      toast.success(data.message || 'Order cancelled successfully');
      setShowCancel(false); setCancelTarget(null);
      fetchSales();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Cancel failed';
      toast.error(msg);
    } finally { setCancelling(false); }
  };

  /* ── RETURN ──────────────────────────────────────────────────── */
  const openReturn = (sale) => {
    setReturnSale(sale);
    // Each item starts UNchecked, qty=1, reason=''
    setReturnItems((sale.items || []).map(i => ({
      medicine:     i.medicine?._id || i.medicine || null,
      medicineName: i.medicineName || '',
      maxQty:       i.quantity,
      returnQty:    1,
      unitPrice:    i.unitPrice || 0,
      reason:       '',
      customReason: '',
      checked:      false,   // ← drives visibility of reason section
    })));
    setRefundMethod('cash');
    setReturnNote('');
    setShowReturn(true);
  };

  /* toggle item checked state */
  const toggleItem = (idx) =>
    setReturnItems(prev => prev.map((it,i) => i===idx ? {...it, checked:!it.checked} : it));

  const setRetQty = (idx, val) => {
    const n = Math.max(1, Math.min(parseInt(val,10)||1, returnItems[idx]?.maxQty||1));
    setReturnItems(prev => prev.map((it,i) => i===idx ? {...it, returnQty:n} : it));
  };

  const setReason = (idx, val) =>
    setReturnItems(prev => prev.map((it,i) => i===idx ? {...it, reason:val, customReason:''} : it));

  const setCustomReason = (idx, val) =>
    setReturnItems(prev => prev.map((it,i) => i===idx ? {...it, customReason:val} : it));

  const checkedItems = returnItems.filter(i => i.checked);
  const returnTotal  = checkedItems.reduce((s,i) => s + i.returnQty * i.unitPrice, 0);

  /* return is ready when every checked item has a reason */
  const returnReady = checkedItems.length > 0 &&
    checkedItems.every(i =>
      i.reason && (i.reason !== 'Other (type below)' || i.customReason.trim())
    );

  const handleReturn = async () => {
    if (checkedItems.length === 0) { toast.error('Select at least one item to return'); return; }
    if (!returnReady) { toast.error('Select a reason for every checked item'); return; }
    setReturning(true);
    try {
      const { data } = await api.post('/returns', {
        saleId:       returnSale._id,
        refundMethod,
        notes:        returnNote,
        items: checkedItems.map(i => ({
          medicine:     i.medicine,
          medicineName: i.medicineName,
          quantity:     i.returnQty,
          unitPrice:    i.unitPrice,
          subtotal:     i.returnQty * i.unitPrice,
          reason:       i.reason === 'Other (type below)' ? i.customReason : i.reason,
        })),
      });
      toast.success(data.message);
      setShowReturn(false); setReturnSale(null);
      fetchSales();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return failed');
    } finally { setReturning(false); }
  };

  /* client-side search filter */
  const displayed = search.trim()
    ? sales.filter(s =>
        (s.invoiceNo||'').toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName||'').toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  const revenue     = sales.filter(s=>s.status==='completed').reduce((s,x)=>s+(x.totalAmount||0),0);
  const returnedAmt = returns.reduce((s,r)=>s+(r.totalAmount||0),0);

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:22 }}>

      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', marginBottom:4 }}>Sales & Returns</h1>
        <p style={{ fontSize:14, color:'var(--text-muted)' }}>
          View history · cancel within 3 hrs · process customer returns
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14 }}>
        {[
          { label:'Total Sales',   value:total,                                color:'#2563EB', icon:'🛒' },
          { label:'Revenue',       value:`PKR ${revenue.toLocaleString()}`,    color:'#10B981', icon:'💰' },
          { label:'Total Returns', value:returns.length,                       color:'#7C3AED', icon:'↩️' },
          { label:'Refunded',      value:`PKR ${returnedAmt.toLocaleString()}`,color:'#EF4444', icon:'💸' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:'18px 20px', display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ fontSize:28 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--border)' }}>
        {[['sales','🛒 Sales History'],['returns','↩️ Returns & Cancellations']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding:'10px 22px', border:'none', background:'none', cursor:'pointer',
            fontSize:14, fontWeight:700, fontFamily:'inherit',
            color: tab===v?'var(--primary)':'var(--text-muted)',
            borderBottom:`2px solid ${tab===v?'var(--primary)':'transparent'}`,
            marginBottom:-2, transition:'all 0.2s',
          }}>{l}</button>
        ))}
      </div>

      {/* ══════ SALES TAB ══════ */}
      {tab === 'sales' && (
        <>
          {/* policy notice */}
          <div style={{ padding:'11px 16px', background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.18)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
            <MdTimer size={18} style={{ color:'#2563EB', flexShrink:0 }}/>
            <span style={{ fontSize:13, color:'#1E40AF' }}>
              <strong>Policy:</strong> Orders can be cancelled within <strong>3 hours</strong>. After that use <strong>Return</strong>.
            </span>
          </div>

          {/* filters */}
          <div className="card" style={{ padding:'12px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:15 }}>🔍</span>
              <input className="input-field" style={{ paddingLeft:32, height:36, fontSize:13 }}
                placeholder="Search invoice or customer name..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <input type="date" className="input-field" style={{ width:145,height:36 }} value={from} onChange={e=>setFrom(e.target.value)} />
            <span style={{ color:'var(--text-muted)' }}>—</span>
            <input type="date" className="input-field" style={{ width:145,height:36 }} value={to}   onChange={e=>setTo(e.target.value)} />
            <select className="input-field" style={{ width:150,height:36,fontSize:13 }}
              value={statusFilt} onChange={e=>{setStatusFilt(e.target.value);setPage(1);}}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            {(from||to||statusFilt||search) && (
              <button className="btn btn-outline btn-sm" style={{ height:36 }}
                onClick={()=>{setFrom('');setTo('');setStatusFilt('');setSearch('');setPage(1);}}>
                <MdClose size={13}/> Clear
              </button>
            )}
            <span style={{ marginLeft:'auto',fontSize:13,color:'var(--text-muted)' }}>{total} records</span>
          </div>

          {/* table */}
          <div className="card" style={{ overflow:'hidden' }}>
            {loading ? <Loader /> : (
              <>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%',borderCollapse:'collapse',minWidth:860 }}>
                    <thead>
                      <tr style={{ background:'var(--bg)' }}>
                        {['Invoice','Customer','Items','Total','Payment','Status','Date & Time','Actions'].map(h=>(
                          <th key={h} style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,
                            color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',
                            borderBottom:'2px solid var(--border)',whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.length===0
                        ? <tr><td colSpan={8} style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>
                            <MdReceipt size={40} style={{ opacity:0.15,display:'block',margin:'0 auto 10px' }}/>
                            No sales found
                          </td></tr>
                        : displayed.map(sale => (
                          <tr key={sale._id} style={{ borderBottom:'1px solid var(--border)',transition:'background 0.15s' }}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.03)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'13px 16px' }}>
                              <div style={{ fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--primary)' }}>{sale.invoiceNo}</div>
                            </td>
                            <td style={{ padding:'13px 16px' }}>
                              <div style={{ fontWeight:600,fontSize:13 }}>{sale.customerName||'Walk-in'}</div>
                              {sale.servedBy?.name&&<div style={{ fontSize:11,color:'var(--text-muted)' }}>by {sale.servedBy.name}</div>}
                            </td>
                            <td style={{ padding:'13px 16px' }}>
                              <span style={{ background:'rgba(37,99,235,0.08)',color:'#2563EB',padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600 }}>
                                {sale.items?.length} item{sale.items?.length!==1?'s':''}
                              </span>
                            </td>
                            <td style={{ padding:'13px 16px',fontWeight:800,fontSize:14 }}>PKR {sale.totalAmount?.toLocaleString()}</td>
                            <td style={{ padding:'13px 16px',fontSize:12,color:'var(--text-muted)' }}>{PAY_LABELS[sale.paymentMethod]||sale.paymentMethod}</td>
                            <td style={{ padding:'13px 16px' }}><Pill value={sale.status} map={STATUS_MAP}/></td>
                            <td style={{ padding:'13px 16px',fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap' }}>
                              {new Date(sale.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}
                              <div style={{ fontSize:10,marginTop:1 }}>{new Date(sale.createdAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}</div>
                              {canCancel(sale)&&<div style={{ marginTop:3 }}><Countdown createdAt={sale.createdAt}/></div>}
                            </td>
                            <td style={{ padding:'13px 16px' }}>
                              <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                                <button onClick={()=>setViewSale(sale)}
                                  style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--text-muted)',fontFamily:'inherit' }}>
                                  <MdVisibility size={12}/> View
                                </button>
                                {canCancel(sale)&&(
                                  <button onClick={()=>openCancel(sale)}
                                    style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:700,color:'#DC2626',fontFamily:'inherit' }}>
                                    <MdCancel size={12}/> Cancel
                                  </button>
                                )}
                                {sale.status==='completed'&&(
                                  <button onClick={()=>openReturn(sale)}
                                    style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'5px 10px',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:700,color:'#7C3AED',fontFamily:'inherit' }}>
                                    <MdAssignmentReturn size={12}/> Return
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
                {total>15&&(
                  <div style={{ padding:'13px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--border)',background:'var(--bg)' }}>
                    <span style={{ fontSize:13,color:'var(--text-muted)' }}>Showing <strong>{(page-1)*15+1}</strong>–<strong>{Math.min(page*15,total)}</strong> of <strong>{total}</strong></span>
                    <div style={{ display:'flex',gap:6 }}>
                      <button className="btn btn-outline btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                      <button className="btn btn-outline btn-sm" disabled={page*15>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ══════ RETURNS TAB ══════ */}
      {tab==='returns'&&(
        <div className="card" style={{ overflow:'hidden' }}>
          {retLoading?<Loader/>:(
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:780 }}>
                <thead><tr style={{ background:'var(--bg)' }}>
                  {['Return No','Type','Invoice','Customer','Items','Refund','Method','By','Date'].map(h=>(
                    <th key={h} style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',borderBottom:'2px solid var(--border)',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {returns.length===0
                    ?<tr><td colSpan={9} style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>No returns yet</td></tr>
                    :returns.map(r=>(
                      <tr key={r._id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'12px 16px',fontFamily:'monospace',fontWeight:700,fontSize:12,color:'#7C3AED' }}>{r.returnNo}</td>
                        <td style={{ padding:'12px 16px' }}>
                          {r.returnType==='sale_cancellation'
                            ?<span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:'rgba(220,38,38,0.1)',color:'#DC2626',fontSize:11,fontWeight:600 }}><MdCancel size={10}/> Cancelled</span>
                            :<span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:'rgba(124,58,237,0.1)',color:'#7C3AED',fontSize:11,fontWeight:600 }}><MdAssignmentReturn size={10}/> Return</span>}
                        </td>
                        <td style={{ padding:'12px 16px',fontFamily:'monospace',fontSize:11,color:'var(--primary)' }}>{r.originalSale?.invoiceNo||'—'}</td>
                        <td style={{ padding:'12px 16px',fontSize:13,fontWeight:600 }}>{r.customerName}</td>
                        <td style={{ padding:'12px 16px' }}><span style={{ background:'rgba(124,58,237,0.08)',color:'#7C3AED',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600 }}>{r.items?.length}</span></td>
                        <td style={{ padding:'12px 16px',fontWeight:800,color:'#DC2626',fontSize:14 }}>PKR {r.totalAmount?.toLocaleString()}</td>
                        <td style={{ padding:'12px 16px',fontSize:12,color:'var(--text-muted)',textTransform:'capitalize' }}>{r.refundMethod}</td>
                        <td style={{ padding:'12px 16px',fontSize:12,color:'var(--text-muted)' }}>{r.processedBy?.name||'—'}</td>
                        <td style={{ padding:'12px 16px',fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap' }}>{new Date(r.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════ CANCEL MODAL ══════ */}
      <Modal isOpen={showCancel} onClose={()=>!cancelling&&setShowCancel(false)}
        title="Cancel Sale Order" maxWidth={500}
        footer={<>
          <button className="btn btn-outline" onClick={()=>setShowCancel(false)} disabled={cancelling}>Keep Order</button>
          <button onClick={handleCancel} disabled={cancelling}
            style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'10px 22px',background:cancelling?'#6B7280':'#DC2626',color:'white',border:'none',borderRadius:10,cursor:cancelling?'not-allowed':'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit' }}>
            {cancelling?'⏳ Cancelling...':<><MdCancel size={16}/> Confirm Cancel</>}
          </button>
        </>}>
        {cancelTarget&&(
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ padding:'14px 18px',background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)' }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
                <span style={{ fontFamily:'monospace',fontWeight:700,color:'var(--primary)',fontSize:14 }}>{cancelTarget.invoiceNo}</span>
                <span style={{ fontWeight:800,fontSize:16 }}>PKR {cancelTarget.totalAmount?.toLocaleString()}</span>
              </div>
              <div style={{ fontSize:13,color:'var(--text-muted)' }}>{cancelTarget.customerName} · {cancelTarget.items?.length} items</div>
            </div>
            <div style={{ padding:'12px 16px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:12 }}>
              <div style={{ display:'flex',gap:8 }}>
                <MdWarning size={20} style={{ color:'#F59E0B',flexShrink:0,marginTop:1 }}/>
                <ul style={{ fontSize:13,color:'#92400E',paddingLeft:16,lineHeight:2,margin:0 }}>
                  <li>Stock will be restored to inventory</li>
                  <li>Refund <strong>PKR {cancelTarget.totalAmount?.toLocaleString()}</strong> to customer</li>
                  <li>Customer loyalty points will be reversed</li>
                </ul>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.5px' }}>Refund Method</label>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                {[['cash','💵 Cash'],['card','💳 Card'],['credit','🏪 Credit']].map(([v,l])=>(
                  <button key={v} onClick={()=>setCancelForm(f=>({...f,refundMethod:v}))}
                    style={{ padding:'9px 0',border:`2px solid ${cancelForm.refundMethod===v?'var(--primary)':'var(--border)'}`,borderRadius:10,background:cancelForm.refundMethod===v?'rgba(37,99,235,0.08)':'transparent',color:cancelForm.refundMethod===v?'var(--primary)':'var(--text-muted)',cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:'inherit' }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px' }}>Reason (optional)</label>
              <textarea className="input-field" rows={2} value={cancelForm.notes} onChange={e=>setCancelForm(f=>({...f,notes:e.target.value}))} placeholder="Why is this being cancelled?" />
            </div>
            <div style={{ padding:'10px 14px',background:'rgba(37,99,235,0.06)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:10,display:'flex',alignItems:'center',gap:8 }}>
              <MdTimer size={16} style={{ color:'#2563EB' }}/>
              <span style={{ fontSize:12,color:'#1E40AF',fontWeight:500 }}>Time remaining: </span>
              <Countdown createdAt={cancelTarget.createdAt}/>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════ RETURN MODAL ══════ */}
      <Modal isOpen={showReturn} onClose={()=>!returning&&setShowReturn(false)}
        title="Process Customer Return" maxWidth={700}
        footer={<>
          <button className="btn btn-outline" onClick={()=>setShowReturn(false)} disabled={returning}>Cancel</button>
          <button onClick={handleReturn} disabled={returning||checkedItems.length===0}
            style={{
              display:'inline-flex',alignItems:'center',gap:6,padding:'10px 24px',
              background: returning||checkedItems.length===0 ? '#6B7280':'#7C3AED',
              color:'white',border:'none',borderRadius:10,
              cursor: returning||checkedItems.length===0?'not-allowed':'pointer',
              fontSize:14,fontWeight:700,fontFamily:'inherit',
            }}>
            {returning ? '⏳ Processing...'
              : checkedItems.length===0 ? '↩️ Tick items above to return'
              : !returnReady ? '⚠️ Select reason for each item'
              : `↩️ Process Return — PKR ${returnTotal.toLocaleString()}`}
          </button>
        </>}>
        {returnSale&&(
          <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

            {/* sale info */}
            <div style={{ padding:'14px 18px',background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10 }}>
              <div>
                <div style={{ fontFamily:'monospace',fontWeight:700,color:'var(--primary)',fontSize:14 }}>{returnSale.invoiceNo}</div>
                <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:3 }}>{returnSale.customerName} · {new Date(returnSale.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11,color:'var(--text-muted)' }}>Original Total</div>
                <div style={{ fontWeight:800,fontSize:17 }}>PKR {returnSale.totalAmount?.toLocaleString()}</div>
              </div>
            </div>

            {/* instruction */}
            <div style={{ padding:'11px 15px',background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:10 }}>
              <p style={{ fontSize:13,color:'#6D28D9',fontWeight:600 }}>
                👇 <strong>Tick</strong> each medicine you want to return, set quantity, then pick a reason.
                Stock will be added back to inventory automatically.
              </p>
            </div>

            {/* ── items ── */}
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {returnItems.map((item,idx) => (
                <div key={idx} style={{
                  border:`2px solid ${item.checked?'#7C3AED':'var(--border)'}`,
                  borderRadius:14, overflow:'hidden',
                  background: item.checked?'rgba(124,58,237,0.03)':'var(--bg-card)',
                  transition:'border-color 0.2s, background 0.2s',
                }}>

                  {/* ── header row: checkbox + name + qty ── */}
                  <div style={{ padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
                    {/* big visible checkbox */}
                    <div onClick={()=>toggleItem(idx)}
                      style={{ width:24,height:24,borderRadius:6,border:`2px solid ${item.checked?'#7C3AED':'#94A3B8'}`,
                        background:item.checked?'#7C3AED':'transparent',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        cursor:'pointer',flexShrink:0,transition:'all 0.2s' }}>
                      {item.checked && <span style={{ color:'white',fontSize:14,fontWeight:900,lineHeight:1 }}>✓</span>}
                    </div>

                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:14,color:'var(--text)' }}>{item.medicineName}</div>
                      <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>
                        Sold: <strong>{item.maxQty}</strong> units &nbsp;·&nbsp; PKR <strong>{item.unitPrice?.toLocaleString()}</strong> each
                      </div>
                    </div>

                    {/* qty controls — only when checked */}
                    {item.checked&&(
                      <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
                        <button onClick={()=>setRetQty(idx,item.returnQty-1)}
                          style={{ width:30,height:30,border:'1px solid var(--border)',borderRadius:8,background:'var(--bg)',cursor:'pointer',fontSize:18,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text)' }}>−</button>
                        <input type="number" min={1} max={item.maxQty} value={item.returnQty}
                          onChange={e=>setRetQty(idx,e.target.value)}
                          style={{ width:54,height:30,textAlign:'center',border:'2px solid var(--border)',borderRadius:8,fontWeight:800,fontSize:15,background:'var(--bg-card)',color:'var(--text)',fontFamily:'inherit' }}/>
                        <button onClick={()=>setRetQty(idx,item.returnQty+1)}
                          style={{ width:30,height:30,border:'none',borderRadius:8,background:'#7C3AED',cursor:'pointer',fontSize:18,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}>+</button>
                        <div style={{ fontWeight:800,color:'#7C3AED',fontSize:14,minWidth:80,textAlign:'right' }}>
                          PKR {(item.returnQty*item.unitPrice).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── reason section — SHOWN WHEN CHECKED ── */}
                  {item.checked&&(
                    <div style={{ borderTop:'1px solid var(--border)',padding:'14px 16px',background:'rgba(124,58,237,0.02)' }}>
                      <label style={{ fontSize:12,fontWeight:700,color:'#6D28D9',display:'block',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.4px' }}>
                        ✳️ Return Reason (required)
                      </label>

                      {/* reason pills */}
                      <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:10 }}>
                        {RETURN_REASONS.map(r=>(
                          <button key={r} type="button" onClick={()=>setReason(idx,r)}
                            style={{
                              padding:'7px 14px',borderRadius:22,cursor:'pointer',fontFamily:'inherit',
                              fontSize:12,fontWeight:600,transition:'all 0.15s',
                              border: item.reason===r?'2px solid #7C3AED':'2px solid var(--border)',
                              background: item.reason===r?'#7C3AED':'var(--bg)',
                              color: item.reason===r?'white':'var(--text-muted)',
                            }}>
                            {r}
                          </button>
                        ))}
                      </div>

                      {/* custom reason input */}
                      {item.reason==='Other (type below)'&&(
                        <input className="input-field"
                          placeholder="Type your reason here..."
                          value={item.customReason}
                          onChange={e=>setCustomReason(idx,e.target.value)}
                          autoFocus
                        />
                      )}

                      {/* warning if no reason */}
                      {!item.reason&&(
                        <p style={{ fontSize:12,color:'#EF4444',fontWeight:600,marginTop:4 }}>
                          ⚠ Please select a reason above
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* refund summary */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
              <div>
                <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.5px' }}>Refund Method</label>
                <div style={{ display:'flex',gap:6 }}>
                  {[['cash','💵 Cash'],['credit','🏪 Credit'],['exchange','🔄 Exchange']].map(([v,l])=>(
                    <button key={v} onClick={()=>setRefundMethod(v)}
                      style={{ flex:1,padding:'9px 0',border:`2px solid ${refundMethod===v?'#7C3AED':'var(--border)'}`,borderRadius:9,background:refundMethod===v?'rgba(124,58,237,0.08)':'transparent',color:refundMethod===v?'#7C3AED':'var(--text-muted)',cursor:'pointer',fontWeight:700,fontSize:12,fontFamily:'inherit' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding:14,background:'var(--bg)',borderRadius:12,border:`2px solid ${returnTotal>0?'rgba(124,58,237,0.3)':'var(--border)'}`,textAlign:'center' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4 }}>
                  {checkedItems.length} item{checkedItems.length!==1?'s':''} · Refund
                </div>
                <div style={{ fontSize:24,fontWeight:900,color:returnTotal>0?'#7C3AED':'var(--text-muted)' }}>
                  PKR {returnTotal.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px' }}>Notes (optional)</label>
              <textarea className="input-field" rows={2} value={returnNote} onChange={e=>setReturnNote(e.target.value)} placeholder="Any additional notes..."/>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════ VIEW SALE MODAL ══════ */}
      <Modal isOpen={!!viewSale} onClose={()=>setViewSale(null)} title={viewSale?`Sale — ${viewSale.invoiceNo}`:''} maxWidth={540}>
        {viewSale&&(
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
              {[['Customer',viewSale.customerName],['Status',null,<Pill value={viewSale.status} map={STATUS_MAP}/>],['Payment',PAY_LABELS[viewSale.paymentMethod]||viewSale.paymentMethod],['Served By',viewSale.servedBy?.name||'—'],['Total',`PKR ${viewSale.totalAmount?.toLocaleString()}`],['Date',new Date(viewSale.createdAt).toLocaleString('en-PK')]].map(([k,v,el])=>(
                <div key={k} style={{ padding:'10px 14px',background:'var(--bg)',borderRadius:10 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:4 }}>{k}</div>
                  {el||<div style={{ fontWeight:600,fontSize:13 }}>{v}</div>}
                </div>
              ))}
            </div>
            <div style={{ border:'1px solid var(--border)',borderRadius:12,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'var(--bg)' }}>{['Medicine','Qty','Price','Total'].map(h=><th key={h} style={{ padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',borderBottom:'1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {viewSale.items?.map((item,i)=>(
                    <tr key={i} style={{ borderBottom:i<viewSale.items.length-1?'1px solid var(--border)':'none' }}>
                      <td style={{ padding:'11px 14px',fontWeight:600,fontSize:13 }}>{item.medicineName}</td>
                      <td style={{ padding:'11px 14px',fontSize:13 }}>{item.quantity}</td>
                      <td style={{ padding:'11px 14px',fontSize:13 }}>PKR {item.unitPrice}</td>
                      <td style={{ padding:'11px 14px',fontWeight:700,color:'var(--primary)' }}>PKR {item.subtotal?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
