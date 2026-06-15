import React, { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdEdit, MdDelete, MdPerson, MdPhone, MdEmail, MdAttachMoney, MdPayment, MdSchedule, MdWarning } from 'react-icons/md';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Loader from '../components/common/Loader';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ROLES  = ['admin','staff','accountant','inventory_manager'];
const SHIFTS = ['morning','evening','night'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EMPTY  = { name:'', email:'', password:'', role:'staff', phone:'', cnic:'', salary:'', shift:'morning', address:'', joiningDate: new Date().toISOString().split('T')[0] };

const ROLE_COLORS = {
  superadmin:'#EF4444', admin:'#2563EB', staff:'#10B981',
  accountant:'#F59E0B', inventory_manager:'#6366F1'
};

export default function Staff() {
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('staff');
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  // Payroll
  const [payroll,     setPayroll]     = useState([]);
  const [payrollForm, setPayrollForm] = useState({ userId:'', month: new Date().getMonth()+1, year: new Date().getFullYear(), bonus:0, deductions:0 });
  const [payLoading,  setPayLoading]  = useState(false);

  // Salary advance
  const [advances,    setAdvances]    = useState([]);
  const [advForm,     setAdvForm]     = useState({ userId:'', amount:'', reason:'', repaymentMonth: new Date().getMonth()+1, repaymentYear: new Date().getFullYear() });
  const [advLoading,  setAdvLoading]  = useState(false);
  const [showAdvModal,setShowAdvModal]= useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/staff'); setStaff(data.data); }
    catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  }, []);

  const fetchPayroll = useCallback(async () => {
    try { const { data } = await api.get(`/staff/payroll?month=${payrollForm.month}&year=${payrollForm.year}`); setPayroll(data.data); }
    catch {}
  }, [payrollForm.month, payrollForm.year]);

  const fetchAdvances = useCallback(async () => {
    try { const { data } = await api.get('/staff/salary-advance'); setAdvances(data.data); }
    catch {}
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { if (tab === 'payroll') { fetchPayroll(); fetchAdvances(); } }, [tab, fetchPayroll, fetchAdvances]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({ ...s, password:'', joiningDate: s.joiningDate ? new Date(s.joiningDate).toISOString().split('T')[0] : '' }); setShowModal(true); };

  const confirmDelete = (s) => { setDeleteTarget(s); setConfirmOpen(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/staff/${deleteTarget._id}`);
      toast.success(`${deleteTarget.name} removed from staff`);
      setConfirmOpen(false);
      setDeleteTarget(null);
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return toast.error('Name and email are required');
    if (!editing && !form.password) return toast.error('Password is required for new staff');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/staff/${editing._id}`, form);
        toast.success('Staff profile updated');
      } else {
        await api.post('/staff', form);
        toast.success('Staff member added');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleGeneratePayroll = async () => {
    if (!payrollForm.userId) return toast.error('Select a staff member');
    setPayLoading(true);
    try {
      await api.post('/staff/payroll', payrollForm);
      toast.success('Payroll generated successfully');
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setPayLoading(false); }
  };

  const handleMarkPaid = async (id, name) => {
    try {
      await api.put(`/staff/payroll/${id}/pay`, { paymentMethod: 'cash' });
      toast.success(`Salary paid to ${name}`);
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAdvance = async () => {
    if (!advForm.userId || !advForm.amount) return toast.error('Select staff and enter amount');
    setAdvLoading(true);
    try {
      await api.post('/staff/salary-advance', advForm);
      toast.success('Salary advance recorded');
      setShowAdvModal(false);
      fetchAdvances();
      setAdvForm({ userId:'', amount:'', reason:'', repaymentMonth: new Date().getMonth()+1, repaymentYear: new Date().getFullYear() });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAdvLoading(false); }
  };

  const inp = f => ({ value: form[f]||'', onChange: e => setForm({...form,[f]:e.target.value}), className:'input-field' });

  const totalSalaries = staff.filter(s => s.isActive).reduce((sum, s) => sum + (s.salary||0), 0);
  const pendingAdvances = advances.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="fade-in">
      <PageHeader title="Staff Management" subtitle={`${staff.filter(s=>s.isActive).length} active team members`}
        action={
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline" onClick={() => { setShowAdvModal(true); }}>💰 Salary Advance</button>
            <button className="btn btn-primary" onClick={openAdd}><MdAdd size={18} /> Add Staff</button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:20 }}>
        {[
          { label:'Total Staff',       value: staff.filter(s=>s.isActive).length, color:'#2563EB', icon:'👥' },
          { label:'Monthly Payroll',   value:`PKR ${totalSalaries.toLocaleString()}`, color:'#10B981', icon:'💰' },
          { label:'Pending Advances',  value:`PKR ${pendingAdvances.toLocaleString()}`, color:'#EF4444', icon:'⚠️' },
          { label:'Active This Month', value: staff.filter(s=>s.isActive && s.shift).length, color:'#6366F1', icon:'✅' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:18 }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['staff','👥 Staff Members'],['payroll','💳 Payroll'],['advances','💵 Salary Advances']].map(([v,l]) => (
          <button key={v} className={`btn btn-sm ${tab===v?'btn-primary':'btn-outline'}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── TAB: Staff Cards ── */}
      {tab === 'staff' && (
        loading ? <Loader /> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
            {staff.length === 0 ? (
              <div className="card" style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--text-muted)' }}>No staff members found. Add your first staff member.</div>
            ) : staff.map(s => (
              <div key={s._id} className="card" style={{ padding:22, opacity: s.isActive ? 1 : 0.5 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ width:50, height:50, background:`linear-gradient(135deg, ${ROLE_COLORS[s.role]||'#2563EB'}, ${ROLE_COLORS[s.role]||'#2563EB'}bb)`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:20 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                    <span className="badge" style={{ background:`${ROLE_COLORS[s.role]}20`, color:ROLE_COLORS[s.role], textTransform:'capitalize', fontSize:11 }}>
                      {s.role?.replace('_',' ')}
                    </span>
                    <button onClick={() => openEdit(s)} className="btn btn-outline btn-icon btn-sm" title="Edit profile"><MdEdit size={14} /></button>
                    {s.role !== 'superadmin' && (
                      <button onClick={() => confirmDelete(s)} className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#EF4444' }} title="Remove staff"><MdDelete size={14} /></button>
                    )}
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{s.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdEmail size={12} /> {s.email}</div>
                {s.phone && <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4, marginBottom:3 }}><MdPhone size={12} /> {s.phone}</div>}
                {s.cnic && <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:3 }}>🪪 CNIC: {s.cnic}</div>}
                <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div style={{ padding:'8px 6px', background:'rgba(16,185,129,0.08)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'#10B981' }}>PKR {(s.salary||0).toLocaleString()}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>Salary</div>
                  </div>
                  <div style={{ padding:'8px 6px', background:'rgba(99,102,241,0.08)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#6366F1', textTransform:'capitalize' }}>{s.shift||'—'}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>Shift</div>
                  </div>
                  <div style={{ padding:'8px 6px', background: s.isActive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius:8, textAlign:'center' }}>
                    <div style={{ fontSize:12, fontWeight:700, color: s.isActive ? '#10B981' : '#EF4444' }}>{s.isActive ? 'Active' : 'Inactive'}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>Status</div>
                  </div>
                </div>
                {s.address && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>📍 {s.address}</div>}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TAB: Payroll ── */}
      {tab === 'payroll' && (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Generate payroll */}
          <div className="card" style={{ padding:24 }}>
            <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>💳 Generate Payroll</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Staff Member</label>
                <select className="input-field" value={payrollForm.userId} onChange={e => setPayrollForm({...payrollForm, userId:e.target.value})}>
                  <option value="">Select staff...</option>
                  {staff.filter(s=>s.isActive).map(s => <option key={s._id} value={s._id}>{s.name} — PKR {(s.salary||0).toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Month</label>
                <select className="input-field" value={payrollForm.month} onChange={e => setPayrollForm({...payrollForm, month:Number(e.target.value)})}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Year</label>
                <select className="input-field" value={payrollForm.year} onChange={e => setPayrollForm({...payrollForm, year:Number(e.target.value)})}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Bonus (PKR)</label>
                <input className="input-field" type="number" min={0} value={payrollForm.bonus} onChange={e => setPayrollForm({...payrollForm, bonus:Number(e.target.value)})} placeholder="0" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Extra Deductions</label>
                <input className="input-field" type="number" min={0} value={payrollForm.deductions} onChange={e => setPayrollForm({...payrollForm, deductions:Number(e.target.value)})} placeholder="0" />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end' }}>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={handleGeneratePayroll} disabled={payLoading}>
                  {payLoading ? 'Generating...' : '⚡ Generate'}
                </button>
              </div>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>💡 Salary advances for the selected month will be automatically deducted from net salary.</p>
          </div>

          {/* Payroll records */}
          <div className="card">
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700 }}>Payroll — {MONTHS[payrollForm.month-1]} {payrollForm.year}</span>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>Total: PKR {payroll.reduce((s,p)=>s+p.netSalary,0).toLocaleString()}</span>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Staff</th><th>Role</th><th>Basic Salary</th><th>Bonus</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {payroll.length === 0
                    ? <tr><td colSpan={8} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No payroll records for this month. Generate payroll above.</td></tr>
                    : payroll.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontWeight:600 }}>{p.user?.name}</td>
                        <td><span className="badge badge-info" style={{ textTransform:'capitalize' }}>{p.user?.role?.replace('_',' ')}</span></td>
                        <td>PKR {p.basicSalary?.toLocaleString()}</td>
                        <td style={{ color:'#10B981' }}>+ PKR {(p.bonus||0).toLocaleString()}</td>
                        <td style={{ color:'#EF4444' }}>− PKR {(p.deductions||0).toLocaleString()}</td>
                        <td style={{ fontWeight:800, color:'var(--primary)' }}>PKR {p.netSalary?.toLocaleString()}</td>
                        <td><span className={`badge ${p.status==='paid'?'badge-success':'badge-warning'}`}>{p.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
                        <td>
                          {p.status !== 'paid' && (
                            <button onClick={() => handleMarkPaid(p._id, p.user?.name)} className="btn btn-sm btn-secondary" style={{ fontSize:11 }}>Mark Paid</button>
                          )}
                          {p.status === 'paid' && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-PK') : ''}</span>}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Salary Advances ── */}
      {tab === 'advances' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <span style={{ fontSize:14, fontWeight:600 }}>All salary advance records</span>
              {pendingAdvances > 0 && <span className="badge badge-danger" style={{ marginLeft:10 }}>⚠️ PKR {pendingAdvances.toLocaleString()} pending</span>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdvModal(true)}><MdAdd size={16} /> Record Advance</button>
          </div>
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Staff</th><th>Amount</th><th>Reason</th><th>Date</th><th>Repayment Month</th><th>Status</th><th>Approved By</th></tr></thead>
                <tbody>
                  {advances.length === 0
                    ? <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>No salary advance records found.</td></tr>
                    : advances.map(a => (
                      <tr key={a._id}>
                        <td style={{ fontWeight:600 }}>{a.user?.name}</td>
                        <td style={{ fontWeight:700, color:'#EF4444' }}>PKR {a.amount?.toLocaleString()}</td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>{a.reason || '—'}</td>
                        <td style={{ fontSize:12 }}>{new Date(a.createdAt).toLocaleDateString('en-PK')}</td>
                        <td style={{ fontSize:12 }}>{MONTHS[(a.repaymentMonth||1)-1]} {a.repaymentYear}</td>
                        <td><span className={`badge ${a.status==='pending'?'badge-warning':a.status==='deducted'?'badge-success':'badge-info'}`} style={{ textTransform:'capitalize' }}>{a.status}</span></td>
                        <td style={{ fontSize:12 }}>{a.approvedBy?.name || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? `Edit — ${editing.name}` : 'Add New Staff Member'} maxWidth={640}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Profile' : 'Add Staff'}</button>
        </>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Full Name *</label><input {...inp('name')} placeholder="Full name" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Email *</label><input {...inp('email')} type="email" placeholder="email@example.com" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Phone</label><input {...inp('phone')} placeholder="0300-0000000" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>CNIC</label><input {...inp('cnic')} placeholder="35202-1234567-1" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label><input {...inp('password')} type="password" placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Role</label>
            <select className="input-field" value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1).replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Shift</label>
            <select className="input-field" value={form.shift} onChange={e => setForm({...form, shift:e.target.value})}>
              {SHIFTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Monthly Salary (PKR)</label><input {...inp('salary')} type="number" placeholder="0" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Joining Date</label><input {...inp('joiningDate')} type="date" /></div>
          <div style={{ gridColumn:'1/-1' }}><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Address</label><input {...inp('address')} placeholder="Home address" /></div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Emergency Contact</label><input {...inp('emergencyContact')} placeholder="Emergency contact number" /></div>
          {editing && (
            <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:20 }}>
              <input type="checkbox" id="isActive" checked={form.isActive !== false} onChange={e => setForm({...form, isActive: e.target.checked})} style={{ width:16, height:16 }} />
              <label htmlFor="isActive" style={{ fontSize:13, fontWeight:600, cursor:'pointer' }}>Account Active</label>
            </div>
          )}
        </div>
      </Modal>

      {/* Salary Advance Modal */}
      <Modal isOpen={showAdvModal} onClose={() => setShowAdvModal(false)} title="💰 Record Salary Advance" maxWidth={480}
        footer={<>
          <button className="btn btn-outline" onClick={() => setShowAdvModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdvance} disabled={advLoading}>{advLoading ? 'Saving...' : 'Record Advance'}</button>
        </>}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:14, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12 }}>
            <p style={{ fontSize:13, color:'#92400E', fontWeight:500 }}>⚠️ The advance amount will be automatically deducted when payroll is generated for the selected repayment month.</p>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Staff Member *</label>
            <select className="input-field" value={advForm.userId} onChange={e => setAdvForm({...advForm, userId:e.target.value})}>
              <option value="">Select staff member...</option>
              {staff.filter(s=>s.isActive).map(s => <option key={s._id} value={s._id}>{s.name} — PKR {(s.salary||0).toLocaleString()}/mo</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Advance Amount (PKR) *</label>
            <input className="input-field" type="number" min={1} value={advForm.amount} onChange={e => setAdvForm({...advForm, amount:e.target.value})} placeholder="Enter amount..." style={{ fontSize:16, fontWeight:700 }} />
          </div>
          <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Reason</label>
            <textarea className="input-field" rows={2} value={advForm.reason} onChange={e => setAdvForm({...advForm, reason:e.target.value})} placeholder="Reason for advance..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Repayment Month</label>
              <select className="input-field" value={advForm.repaymentMonth} onChange={e => setAdvForm({...advForm, repaymentMonth:Number(e.target.value)})}>
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:6 }}>Year</label>
              <select className="input-field" value={advForm.repaymentYear} onChange={e => setAdvForm({...advForm, repaymentYear:Number(e.target.value)})}>
                {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Staff Member"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from the system? They will be marked inactive and cannot log in.`}
        confirmText="Yes, Remove"
      />
    </div>
  );
}
