import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdAdd, MdRemove, MdDelete, MdSearch, MdPrint, MdPointOfSale, MdPerson, MdCheck } from 'react-icons/md';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Print receipt ─────────────────────────────────────────────── */
const printReceipt = (sale) => {
  try {
    const settings = JSON.parse(localStorage.getItem('storeSettings') || '{}');
    const storeName = settings.storeName || 'Bilal Inayat Medical Store';
    const storePhone = settings.storePhone || '0300-1234567';
    const storeAddress = settings.storeAddress || '';
    const footer = settings.invoiceFooter || 'Thank you! Get well soon 💊';

    const win = window.open('', '_blank', 'width=420,height=650');
    if (!win) { toast.error('Allow popups to print receipt'); return; }

    const date = new Date(sale.createdAt || Date.now()).toLocaleString('en-PK');
    const rows = (sale.items || []).map(i =>
      `<tr>
        <td style="padding:5px 0;font-size:13px;">${i.medicineName}</td>
        <td style="text-align:center;padding:5px 0;font-size:13px;">${i.quantity}</td>
        <td style="text-align:right;padding:5px 0;font-size:13px;font-weight:700;">PKR ${((i.quantity||0)*(i.unitPrice||0)).toLocaleString()}</td>
      </tr>`
    ).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>${sale.invoiceNo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;max-width:380px;margin:0 auto;padding:20px;color:#000}
      .header{text-align:center;border-bottom:2px dashed #000;padding-bottom:12px;margin-bottom:14px}
      .header h2{font-size:17px;margin-bottom:3px}
      .header p{font-size:12px;color:#555;margin:2px 0}
      .meta{font-size:12px;margin-bottom:12px;color:#333}
      .meta div{margin:2px 0}
      table{width:100%;border-collapse:collapse}
      th{font-size:11px;border-bottom:1px solid #ccc;padding:5px 0;text-align:left;font-weight:700;text-transform:uppercase}
      th:nth-child(2){text-align:center}
      th:last-child{text-align:right}
      .totals{border-top:2px dashed #000;margin-top:12px;padding-top:10px}
      .totals tr td{font-size:13px;padding:3px 0}
      .total-row td{font-weight:800;font-size:15px;border-top:1px solid #ccc;padding-top:6px;margin-top:4px}
      .footer{text-align:center;margin-top:16px;font-size:12px;color:#555;border-top:1px dashed #000;padding-top:10px}
      @media print{body{margin:0}}
    </style></head><body>
    <div class="header">
      <h2>${storeName}</h2>
      ${storeAddress ? `<p>${storeAddress}</p>` : ''}
      <p>Tel: ${storePhone}</p>
    </div>
    <div class="meta">
      <div><strong>Invoice:</strong> ${sale.invoiceNo}</div>
      <div><strong>Date:</strong> ${date}</div>
      <div><strong>Customer:</strong> ${sale.customerName || 'Walk-in Customer'}</div>
      <div><strong>Payment:</strong> ${(sale.paymentMethod || 'cash').toUpperCase()}</div>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right">PKR ${(sale.subtotal||0).toLocaleString()}</td></tr>
      ${(sale.discountAmount||0)>0?`<tr><td>Discount</td><td style="text-align:right;color:green">- PKR ${sale.discountAmount.toLocaleString()}</td></tr>`:''}
      <tr class="total-row"><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>PKR ${(sale.totalAmount||0).toLocaleString()}</strong></td></tr>
      <tr><td>Paid</td><td style="text-align:right">PKR ${(sale.paidAmount||0).toLocaleString()}</td></tr>
      ${(sale.changeAmount||0)>0?`<tr><td>Change</td><td style="text-align:right">PKR ${sale.changeAmount.toLocaleString()}</td></tr>`:''}
    </table>
    <div class="footer"><p>${footer}</p></div>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),1200)}<\/script>
    </body></html>`);
    win.document.close();
  } catch (err) { console.error('Print error:', err); }
};

/* ── Component ─────────────────────────────────────────────────── */
export default function BillingPOS() {
  const [search,       setSearch]       = useState('');
  const [results,      setResults]      = useState([]);
  const [cart,         setCart]         = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [payMethod,    setPayMethod]    = useState('cash');
  const [paidAmount,   setPaidAmount]   = useState('');
  const [discount,     setDiscount]     = useState(0);
  const [processing,   setProcessing]   = useState(false);
  const [lastSale,     setLastSale]     = useState(null);
  const [showResults,  setShowResults]  = useState(false);
  const searchRef  = useRef();
  const resultsRef = useRef();

  /* derived */
  const subtotal = cart.reduce((s,i) => s + (Number(i.qty)||0) * i.salePrice, 0);
  const discAmt  = Math.round((subtotal * discount) / 100);
  const total    = subtotal - discAmt;
  const paid     = parseFloat(paidAmount) || 0;
  const change   = paid - total;

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (!resultsRef.current?.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* search medicines */
  const searchMeds = useCallback(async (q) => {
    if (!q || q.length < 1) { setResults([]); setShowResults(false); return; }
    try {
      const { data } = await api.get(`/medicines?search=${encodeURIComponent(q)}&limit=10`);
      const available = (data.data || []).filter(m => m.quantity > 0);
      setResults(available);
      setShowResults(available.length > 0);
    } catch { setResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMeds(search), 250);
    return () => clearTimeout(t);
  }, [search, searchMeds]);

  /* cart operations */
  const addToCart = (med) => {
    setCart(prev => {
      const exists = prev.find(i => i._id === med._id);
      if (exists) {
        if (exists.qty >= med.quantity) { toast.error(`Only ${med.quantity} in stock`); return prev; }
        return prev.map(i => i._id === med._id ? {...i, qty: i.qty+1} : i);
      }
      return [...prev, { ...med, qty:1, maxQty: med.quantity }];
    });
    setSearch('');
    setResults([]);
    setShowResults(false);
    searchRef.current?.focus();
  };

  /* FIX: manual qty input */
  const updateQty = (id, val) => {
    // If field is empty/cleared, show 0 but keep item in cart
    if (val === '' || val === null || val === undefined) {
      setCart(prev => prev.map(i => i._id === id ? {...i, qty: ''} : i));
      return;
    }
    const n = parseInt(val, 10);
    if (isNaN(n)) {
      setCart(prev => prev.map(i => i._id === id ? {...i, qty: ''} : i));
      return;
    }
    if (n < 1) {
      // Don't remove — just set to empty so user can type
      setCart(prev => prev.map(i => i._id === id ? {...i, qty: ''} : i));
      return;
    }
    setCart(prev => prev.map(i => {
      if (i._id !== id) return i;
      if (n > i.maxQty) { toast.error(`Only ${i.maxQty} units in stock`); return {...i, qty: i.maxQty}; }
      return {...i, qty: n};
    }));
  };

  // When input loses focus, restore to 1 if empty
  const fixQtyOnBlur = (id) => {
    setCart(prev => prev.map(i => {
      if (i._id !== id) return i;
      if (!i.qty || i.qty === '' || Number(i.qty) < 1) return {...i, qty: 1};
      return i;
    }));
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i._id !== id));
  const clearCart  = ()   => { setCart([]); setPaidAmount(''); setDiscount(0); setCustomerName(''); };

  /* checkout */
  const handleCheckout = async () => {
    if (cart.length === 0)   return toast.error('Cart is empty');
    if (total <= 0)          return toast.error('Invalid total');
    if (!paidAmount)         return toast.error('Enter amount paid');
    if (paid < total)        return toast.error(`Need PKR ${(total-paid).toLocaleString()} more`);
    setProcessing(true);
    try {
      const { data } = await api.post('/sales', {
        customerName: customerName.trim() || 'Walk-in Customer',
        paymentMethod: payMethod,
        items: cart.filter(i => (Number(i.qty)||0) > 0).map(i => ({ medicine:i._id, medicineName:i.name, quantity:Number(i.qty), unitPrice:i.salePrice })),
        subtotal, discountAmount:discAmt, taxAmount:0,
        totalAmount:total, paidAmount:paid, changeAmount:Math.max(0,change),
      });
      setLastSale(data.data);
      toast.success(`✅ Sale complete! ${data.data.invoiceNo}`);
      clearCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally { setProcessing(false); }
  };

  const totalItems = cart.reduce((s,i) => s+(Number(i.qty)||0), 0);

  return (
    <div className="fade-in pos-grid">

      {/* ── LEFT: Search + Cart ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16, minHeight:0, overflow:'hidden' }}>

        {/* Search */}
        <div className="card" style={{ padding:20, flexShrink:0 }}>
          <h2 style={{ fontSize:18,fontWeight:800,marginBottom:14,display:'flex',alignItems:'center',gap:8 }}>
            <MdPointOfSale size={22} style={{ color:'var(--primary)' }}/> Billing / POS
          </h2>
          <div style={{ position:'relative' }}>
            <MdSearch size={18} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)' }}/>
            <input ref={searchRef} className="input-field"
              style={{ paddingLeft:40,fontSize:15,height:46 }}
              placeholder="Search medicine by name or barcode..."
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              autoFocus />

            {/* Dropdown */}
            {showResults && results.length > 0 && (
              <div ref={resultsRef} style={{
                position:'absolute',top:'100%',left:0,right:0,zIndex:300,
                background:'var(--bg-card)',border:'1px solid var(--border)',
                borderRadius:12,boxShadow:'var(--shadow-lg)',marginTop:4,overflow:'hidden',
              }}>
                {results.map(m => (
                  <div key={m._id} onClick={() => addToCart(m)}
                    style={{ padding:'12px 16px',cursor:'pointer',display:'flex',
                      justifyContent:'space-between',alignItems:'center',
                      borderBottom:'1px solid var(--border)',transition:'background 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:14 }}>{m.name}</div>
                      <div style={{ fontSize:11,color:'var(--text-muted)' }}>
                        {m.genericName} · Stock:&nbsp;
                        <strong style={{ color:m.quantity<10?'#EF4444':'#10B981' }}>{m.quantity}</strong>
                        &nbsp;{m.unit}
                        {m.prescriptionRequired && <span style={{ marginLeft:6,color:'#F59E0B',fontWeight:700 }}>Rx</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800,color:'var(--primary)',fontSize:15 }}>PKR {m.salePrice?.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize:12,color:'var(--text-muted)',marginTop:8 }}>
            💡 Type name or barcode to search. Click to add to cart. Edit quantity directly in the cart.
          </p>
        </div>

        {/* Cart table */}
        <div className="card" style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
          <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
            <span style={{ fontWeight:700,fontSize:15 }}>
              Cart &nbsp;<span style={{ color:'var(--text-muted)',fontWeight:500 }}>({totalItems} item{totalItems!==1?'s':''})</span>
            </span>
            {cart.length > 0 && (
              <button onClick={clearCart}
                style={{ background:'rgba(239,68,68,0.1)',border:'none',borderRadius:8,
                  padding:'5px 12px',color:'#EF4444',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit' }}>
                🗑 Clear All
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ flex:1,overflowY:'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign:'center',padding:48,color:'var(--text-muted)' }}>
                <MdPointOfSale size={52} style={{ opacity:0.15,marginBottom:12 }}/>
                <p style={{ fontSize:14 }}>Search medicines above to add to cart</p>
              </div>
            ) : (
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg)' }}>
                    {['Medicine','Unit Price','Quantity','Line Total',''].map(h => (
                      <th key={h} style={{ padding:'9px 14px',textAlign:'left',fontSize:11,fontWeight:700,
                        color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.4px',
                        borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item._id} style={{ borderBottom:'1px solid var(--border)',transition:'background 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.02)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:700,fontSize:13 }}>{item.name}</div>
                        <div style={{ fontSize:11,color:'var(--text-muted)' }}>
                          Stock: <span style={{ color:item.maxQty<10?'#EF4444':'#10B981',fontWeight:600 }}>{item.maxQty}</span>
                          &nbsp;{item.unit}
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,color:'var(--text-muted)' }}>
                        PKR {item.salePrice?.toLocaleString()}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        {/* ── Qty control: − input + ── */}
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <button onClick={() => updateQty(item._id, item.qty-1)}
                            style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--border)',
                              background:'var(--bg)',cursor:'pointer',display:'flex',alignItems:'center',
                              justifyContent:'center',color:'var(--text)',fontWeight:700,fontSize:16,flexShrink:0 }}>
                            −
                          </button>
                          {/* MANUAL INPUT */}
                          <input
                            type="number"
                            min={1}
                            max={item.maxQty}
                            value={item.qty}
                            onChange={e => updateQty(item._id, e.target.value)}
                            onBlur={e => { fixQtyOnBlur(item._id); e.target.style.borderColor='var(--border)'; }}
                            style={{
                              width:52, height:28, textAlign:'center',
                              border:'2px solid var(--border)', borderRadius:7,
                              fontWeight:800, fontSize:14,
                              background:'var(--bg-card)', color:'var(--text)',
                              outline:'none', fontFamily:'inherit',
                            }}
                            onFocus={e => e.target.style.borderColor='var(--primary)'}
                          />
                          <button onClick={() => updateQty(item._id, item.qty+1)}
                            style={{ width:28,height:28,borderRadius:7,border:'none',
                              background:'var(--primary)',cursor:'pointer',display:'flex',
                              alignItems:'center',justifyContent:'center',
                              color:'white',fontWeight:700,fontSize:16,flexShrink:0 }}>
                            +
                          </button>
                        </div>
                        <div style={{ fontSize:10,color:'var(--text-muted)',marginTop:3 }}>max {item.maxQty}</div>
                      </td>
                      <td style={{ padding:'12px 14px',fontWeight:800,fontSize:14,color:'var(--primary)' }}>
                        PKR {(item.qty*item.salePrice).toLocaleString()}
                      </td>
                      <td style={{ padding:'12px 10px' }}>
                        <button onClick={() => removeItem(item._id)}
                          style={{ width:28,height:28,border:'none',borderRadius:7,
                            background:'rgba(239,68,68,0.1)',cursor:'pointer',
                            display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444' }}>
                          <MdDelete size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cart totals */}
          {cart.length > 0 && (
            <div style={{ padding:'14px 20px',borderTop:'2px solid var(--border)',background:'rgba(37,99,235,0.02)',flexShrink:0 }}>
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4 }}>
                <span style={{ color:'var(--text-muted)' }}>Subtotal ({totalItems} items)</span>
                <span style={{ fontWeight:600 }}>PKR {subtotal.toLocaleString()}</span>
              </div>
              {discAmt > 0 && (
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4 }}>
                  <span style={{ color:'#10B981' }}>Discount ({discount}%)</span>
                  <span style={{ fontWeight:600,color:'#10B981' }}>− PKR {discAmt.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:900,paddingTop:8,borderTop:'1px solid var(--border)',marginTop:4 }}>
                <span>Total</span>
                <span style={{ color:'var(--primary)' }}>PKR {total.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Checkout ── */}
      <div className="card" style={{ padding:22,display:'flex',flexDirection:'column',gap:18,overflowY:'auto' }}>
        <h3 style={{ fontSize:16,fontWeight:800 }}>💳 Checkout</h3>

        {/* Customer */}
        <div>
          <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Customer Name
          </label>
          <input className="input-field" value={customerName}
            onChange={e=>setCustomerName(e.target.value)}
            placeholder="Walk-in Customer (optional)" />
        </div>

        {/* Payment method */}
        <div>
          <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Payment Method
          </label>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {[['cash','💵 Cash'],['card','💳 Card'],['online','📱 Online'],['split','🔀 Split']].map(([v,l]) => (
              <button key={v} onClick={() => setPayMethod(v)}
                style={{ padding:'9px 0',border:`2px solid ${payMethod===v?'var(--primary)':'var(--border)'}`,
                  borderRadius:10,background:payMethod===v?'rgba(37,99,235,0.08)':'transparent',
                  color:payMethod===v?'var(--primary)':'var(--text-muted)',
                  cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:'inherit',textAlign:'center' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div>
          <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Discount %
          </label>
          <div style={{ display:'flex',gap:6 }}>
            <input className="input-field" type="number" min={0} max={100}
              value={discount} onChange={e=>setDiscount(Math.min(100,Math.max(0,Number(e.target.value))))}
              placeholder="0" style={{ flex:1 }} />
            {[5,10,15,20].map(d => (
              <button key={d} onClick={() => setDiscount(d)}
                style={{ padding:'8px 10px',border:`1px solid ${discount===d?'var(--primary)':'var(--border)'}`,
                  borderRadius:9,background:discount===d?'rgba(37,99,235,0.08)':'var(--bg)',
                  cursor:'pointer',fontSize:12,fontWeight:600,color:discount===d?'var(--primary)':'var(--text-muted)',
                  fontFamily:'inherit' }}>
                {d}%
              </button>
            ))}
          </div>
        </div>

        {/* Amount paid */}
        <div>
          <label style={{ fontSize:12,fontWeight:700,color:'var(--text-muted)',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Amount Paid (PKR)
          </label>
          <input className="input-field" type="number" min={0}
            value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}
            placeholder="Enter cash received..."
            style={{ fontSize:20,fontWeight:800,height:52 }} />
          {/* Quick amount buttons */}
          {total > 0 && (
            <div style={{ display:'flex',gap:6,marginTop:8,flexWrap:'wrap' }}>
              {[total, Math.ceil(total/100)*100, Math.ceil(total/500)*500, Math.ceil(total/1000)*1000]
                .filter((v,i,a) => v>0 && a.indexOf(v)===i).slice(0,4)
                .map(v => (
                  <button key={v} onClick={() => setPaidAmount(String(v))}
                    style={{ flex:1,minWidth:60,padding:'6px 4px',background:paidAmount==v?'rgba(37,99,235,0.1)':'var(--bg)',
                      border:`1px solid ${paidAmount==v?'var(--primary)':'var(--border)'}`,borderRadius:8,
                      cursor:'pointer',fontSize:12,fontWeight:700,
                      color:paidAmount==v?'var(--primary)':'var(--text)',fontFamily:'inherit' }}>
                    {v.toLocaleString()}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ background:'var(--bg)',borderRadius:12,padding:16,border:'1px solid var(--border)' }}>
          {[
            ['Items', totalItems],
            ['Subtotal', `PKR ${subtotal.toLocaleString()}`],
            ...(discAmt>0 ? [['Discount', `− PKR ${discAmt.toLocaleString()}`]] : []),
            ['Total', `PKR ${total.toLocaleString()}`],
            ...(paid>0 ? [['Paid', `PKR ${paid.toLocaleString()}`]] : []),
            ...(paid>=total && paid>0 ? [['Change', `PKR ${Math.max(0,change).toFixed(0)}`]] : []),
          ].map(([k,v],i) => (
            <div key={k} style={{
              display:'flex',justifyContent:'space-between',alignItems:'center',
              fontSize: k==='Total'?16:13,
              fontWeight: k==='Total'||k==='Change'?800:500,
              color: k==='Change'?'#10B981':k==='Discount'?'#10B981':k==='Total'?'var(--primary)':'var(--text)',
              padding:'4px 0',
              borderTop: k==='Total'?'1px solid var(--border)':'none',
              marginTop: k==='Total'?6:0,
            }}>
              <span style={{ color:k==='Change'?'#10B981':k==='Total'?'var(--primary)':'var(--text-muted)' }}>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          {paid>0 && paid<total && (
            <div style={{ marginTop:8,padding:'8px 10px',background:'rgba(239,68,68,0.08)',borderRadius:8,fontSize:12,color:'#EF4444',fontWeight:700 }}>
              ⚠️ Short by PKR {(total-paid).toLocaleString()}
            </div>
          )}
        </div>

        {/* Complete sale */}
        <button onClick={handleCheckout}
          disabled={processing||cart.length===0||paid<total||!paidAmount}
          style={{
            width:'100%',padding:14,border:'none',borderRadius:12,
            fontSize:15,fontWeight:800,fontFamily:'inherit',cursor:'pointer',
            background:(processing||cart.length===0||paid<total||!paidAmount)?'#6B7280':'var(--primary)',
            color:'white',transition:'background 0.2s',
            boxShadow: (processing||cart.length===0||paid<total||!paidAmount)?'none':'0 4px 14px rgba(37,99,235,0.35)',
          }}>
          {processing ? '⏳ Processing...' : cart.length===0 ? 'Add items to cart' : `✅ Complete Sale — PKR ${total.toLocaleString()}`}
        </button>

        {/* Last invoice + print */}
        {lastSale && (
          <div style={{ background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:14,padding:16 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <div>
                <p style={{ fontSize:13,fontWeight:700,color:'#059669' }}>✅ Last Sale</p>
                <p style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>{lastSale.invoiceNo}</p>
              </div>
              <p style={{ fontSize:16,fontWeight:800,color:'#059669' }}>PKR {lastSale.totalAmount?.toLocaleString()}</p>
            </div>
            <button onClick={() => printReceipt(lastSale)}
              style={{ width:'100%',padding:'9px 0',background:'rgba(16,185,129,0.12)',
                border:'1px solid rgba(16,185,129,0.3)',borderRadius:9,cursor:'pointer',
                color:'#059669',fontWeight:700,fontSize:13,fontFamily:'inherit',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
              🖨️ Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
