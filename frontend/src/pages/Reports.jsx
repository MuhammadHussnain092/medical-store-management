import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MdBarChart, MdDownload } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Loader from '../components/common/Loader';
import api from '../utils/api';

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [salesData, setSalesData] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (tab === 'sales') { const { data } = await api.get(`/reports/sales?from=${from}&to=${to}`); setSalesData(data.data); }
      else if (tab === 'profit') { const { data } = await api.get(`/reports/profit?from=${from}&to=${to}`); setProfitData(data.data); }
      else if (tab === 'inventory') { const { data } = await api.get('/reports/inventory'); setInventoryData(data.data); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [tab]);

  const TABS = [['sales','Sales Report'],['profit','Profit & Loss'],['inventory','Inventory Report']];

  return (
    <div className="fade-in">
      <PageHeader title="Reports Center" subtitle="Business intelligence and analytics" />
      <div className="card" style={{ padding:16, marginBottom:20, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        {TABS.map(([v,l]) => <button key={v} className={`btn btn-sm ${tab===v?'btn-primary':'btn-outline'}`} onClick={() => setTab(v)}>{l}</button>)}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto' }}>
          <input type="date" className="input-field" style={{ width:145, height:36 }} value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{ color:'var(--text-muted)', fontSize:13 }}>—</span>
          <input type="date" className="input-field" style={{ width:145, height:36 }} value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={fetchReport}>Generate</button>
        </div>
      </div>

      {loading ? <Loader /> : (
        <>
          {tab === 'sales' && salesData && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
                {[
                  { label:'Total Revenue', value:`PKR ${salesData.summary?.totalRevenue?.toLocaleString()||0}`, color:'#2563EB' },
                  { label:'Total Orders', value:salesData.summary?.totalOrders||0, color:'#10B981' },
                  { label:'Avg Order Value', value:`PKR ${salesData.summary?.avgOrder?.toFixed(0)||0}`, color:'#6366F1' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding:20 }}>
                    <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:24 }}>
                <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={salesData.salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="_id" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} />
                    <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [`PKR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ fill:'#2563EB', r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ padding:24 }}>
                <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Top 10 Products</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesData.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="_id" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickLine={false} width={120} />
                    <Tooltip formatter={v => [`PKR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, fontSize:12 }} />
                    <Bar dataKey="totalRevenue" fill="#10B981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'profit' && profitData && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
              {[
                { label:'Total Revenue', value:profitData.revenue, color:'#2563EB' },
                { label:'Cost of Goods', value:profitData.cost, color:'#F59E0B' },
                { label:'Gross Profit', value:profitData.grossProfit, color:'#10B981' },
                { label:'Total Expenses', value:profitData.expenses, color:'#EF4444' },
                { label:'Net Profit', value:profitData.netProfit, color: profitData.netProfit >= 0 ? '#10B981' : '#EF4444' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding:20 }}>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color }}>PKR {s.value?.toLocaleString()||0}</div>
                  <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:24, fontWeight:800, color: profitData.netProfit >= 0 ? '#10B981' : '#EF4444' }}>{profitData.netMargin}%</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Net Margin</div>
              </div>
            </div>
          )}

          {tab === 'inventory' && inventoryData && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16 }}>
                {[
                  { label:'Total Medicines', value:inventoryData.totalMedicines, color:'#2563EB' },
                  { label:'Stock Value', value:`PKR ${inventoryData.totalValue?.toLocaleString()||0}`, color:'#10B981' },
                  { label:'Low Stock', value:inventoryData.lowStock, color:'#F59E0B' },
                  { label:'Expiring Soon', value:inventoryData.expiring, color:'#F97316' },
                  { label:'Expired', value:inventoryData.expired, color:'#EF4444' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding:18 }}>
                    <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
