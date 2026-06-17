import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const { sidebarCollapsed } = useSelector(s => s.ui);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ml = isMobile ? '0px' : (sidebarCollapsed ? '72px' : '260px');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isMobile={isMobile} />
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }} />
      )}
      <div style={{ flex: 1, marginLeft: ml, transition: 'margin-left 0.3s', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Navbar setMobileOpen={setMobileOpen} isMobile={isMobile} />
        <main style={{ flex: 1, padding: isMobile ? '16px' : '24px' }} className="fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
