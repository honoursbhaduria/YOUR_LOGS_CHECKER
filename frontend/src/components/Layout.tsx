import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import Dock, { DockItemData } from './Dock';

interface LayoutProps {
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    apiClient.logout();
    onLogout();
  };

  const dockItems: DockItemData[] = [
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      label: 'Dashboard',
      onClick: () => navigate('/'),
      className: location.pathname === '/' ? 'active' : ''
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
      label: 'Cases',
      onClick: () => navigate('/cases'),
      className: location.pathname.startsWith('/cases') ? 'active' : ''
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      label: 'Events',
      onClick: () => {
        const caseId = location.pathname.match(/\/cases\/(\d+)/)?.[1];
        if (caseId) navigate(`/cases/${caseId}/events`);
      },
      className: location.pathname.includes('/events') ? 'active' : ''
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
      label: 'Story',
      onClick: () => {
        const caseId = location.pathname.match(/\/cases\/(\d+)/)?.[1];
        if (caseId) navigate(`/cases/${caseId}/story`);
      },
      className: location.pathname.includes('/story') ? 'active' : ''
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      label: 'Report',
      onClick: () => {
        const caseId = location.pathname.match(/\/cases\/(\d+)/)?.[1];
        if (caseId) navigate(`/cases/${caseId}/report`);
      },
      className: location.pathname.includes('/report') ? 'active' : ''
    },
    {
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
      label: 'Logout',
      onClick: handleLogout,
      className: 'logout-item'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-medium text-zinc-100">
                Forensic Analysis
              </h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="font-mono">{new Date().toLocaleDateString()}</span>
              <span className="text-zinc-700">•</span>
              <span className="font-mono">{location.pathname}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-6 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* Dock Navigation */}
      <Dock
        items={dockItems}
        magnification={48}
        distance={100}
        baseItemSize={40}
        panelHeight={56}
      />
    </div>
  );
};

export default Layout;

