import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MdTrendingUp, MdShoppingCart, MdMedication, MdPeople, MdWarning, MdSchedule, MdAttachMoney, MdBarChart } from 'react-icons/md';
import StatCard from '../components/common/StatCard';
import Loader from '../components/common/Loader';
import api from '../utils/api';

const fmt = (n) => {
  if (n >= 1000000) return `PKR ${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `PKR ${(n/1000).toFixed(1)}K`;
  return `PKR ${n?.toFixed ? n.toFixed(0) : 0}`;
};

const COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#6366F1','#EC4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, lowRes, expRes] = await Promise.all([
          api.get('/sales/dashboard'),
          api.get('/medicines/low-stock'),
          api.get('/medicines/expiring?days=30'),
        ]);
        setStats(statsRes.data.data);
        setLowStock(lowRes.data.data?.slice(0, 5) || []);
        setExpiring(expRes.data.data?.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Loader />;

  const days = stats?.last7Days || [];
  const months = stats?.monthlyRevenue || [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Welcome back! Here's what's happening at Bilal Inayat Medical Store today.
        </p>
      </div>

      {/* Alert banners */}
      {(stats?.lowStockCount > 0 || stats?.expiringCount > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {stats?.lowStockCount > 0 && (
            <div style={{ flex: 1, minWidth: 260, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdWarning size={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>⚠️ {stats.lowStockCount} medicines are running low on stock</span>
            </div>
          )}
          {stats?.expiringCount > 0 && (
            <div style={{ flex: 1, minWidth: 260, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdSchedule size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>🕐 {stats.expiringCount} medicines expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        <StatCard title="Today's Revenue" value={fmt(stats?.todayRevenue)} icon={MdAttachMoney} color="#2563EB" bg="rgba(37,99,235,0.1)" subtitle={`${stats?.todayOrders || 0} orders today`} />
        <StatCard title="Monthly Revenue" value={fmt(stats?.monthRevenue)} icon={MdTrendingUp} color="#10B981" bg="rgba(16,185,129,0.1)" subtitle={`${stats?.monthOrders || 0} orders this month`} />
        <StatCard title="Total Medicines" value={stats?.totalMedicines || 0} icon={MdMedication} color="#6366F1" bg="rgba(99,102,241,0.1)" subtitle="Active products" />
        <StatCard title="Total Customers" value={stats?.totalCustomers || 0} icon={MdPeople} color="#F59E0B" bg="rgba(245,158,11,0.1)" subtitle="Registered customers" />
        <StatCard title="Low Stock Items" value={stats?.lowStockCount || 0} icon={MdWarning} color="#EF4444" bg="rgba(239,68,68,0.1)" subtitle="Needs reorder" />
        <StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={MdShoppingCart} color="#EC4899" bg="rgba(236,72,153,0.1)" subtitle="All time" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Revenue — Last 7 Days</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily sales performance</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={days}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`PKR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2.5} fill="url(#rev)" dot={{ fill: '#2563EB', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Bar Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Monthly Overview</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Revenue by month</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months.map(m => ({ ...m, name: monthNames[(m._id || 1) - 1] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`PKR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Low Stock */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Low Stock Alert</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Medicines needing reorder</p>
            </div>
            <span className="badge badge-danger">{stats?.lowStockCount || 0} items</span>
          </div>
          {lowStock.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>✅ All stock levels are healthy</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStock.map(m => (
                <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.category?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{m.quantity} left</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Min: {m.minStockLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Medicines */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Expiry Alert</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expiring within 30 days</p>
            </div>
            <span className="badge badge-warning">{stats?.expiringCount || 0} items</span>
          </div>
          {expiring.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>✅ No medicines expiring soon</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expiring.map(m => {
                const days = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000*60*60*24));
                return (
                  <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(245,158,11,0.05)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.1)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty: {m.quantity}</div>
                    </div>
                    <span className={`badge ${days <= 7 ? 'badge-danger' : 'badge-warning'}`}>{days}d left</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
