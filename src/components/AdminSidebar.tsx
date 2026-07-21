'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, LayoutDashboard, Users, ClipboardList, BarChart3, Settings, ChevronLeft, ChevronRight, LogOut, Calendar, IndianRupee, Activity, Layers, HardDriveDownload, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'MAIN' },
  { id: 'billing', label: 'Daily Billing', icon: <ClipboardList size={18} />, badge: 5, section: 'MAIN' },
  { id: 'rates', label: 'Rate Management', icon: <IndianRupee size={18} />, section: 'MAIN' },
  { id: 'hawkers', label: 'Hawker Registry', icon: <Users size={18} />, section: 'MAIN' },
  { id: 'monthly', label: 'Monthly Tracker', icon: <Calendar size={18} />, section: 'MAIN' },
  { id: 'tracker', label: 'Tracker', icon: <Activity size={18} />, section: 'MAIN' },
  { id: 'groups', label: 'Newspaper Groups', icon: <Layers size={18} />, section: 'MAIN' },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, section: 'REPORTS' },
  { id: 'backup', label: 'Backup & Restore', icon: <HardDriveDownload size={18} />, section: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} />, section: 'SYSTEM' },
];

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const sections = Array.from(new Set(NAV_ITEMS.map((n) => n.section)));

  return (
    <aside
      className={`flex flex-col bg-white border-r border-[hsl(220,15%,88%)] h-screen sticky top-0 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64 lg:w-60'
      } flex-shrink-0 z-20`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-[hsl(220,15%,88%)] ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 gap-3'}`}>
        <div className="w-9 h-9 bg-[hsl(210,67%,23%)] rounded-xl flex items-center justify-center flex-shrink-0">
          <Newspaper size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-slate-900 font-bold text-sm leading-tight truncate">Bhand News</div>
            <div className="text-slate-400 text-xs">Paper Agency</div>
          </div>
        )}
        {/* Close button — mobile only */}
        {!collapsed && (
          <button
            onClick={() => onSectionChange(activeSection)}
            className="lg:hidden ml-auto text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        {sections.map((section) => (
          <div key={`section-${section}`} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                {section}
              </p>
            )}
            {NAV_ITEMS.filter((n) => n.section === section).map((item) => (
              <button
                key={`nav-${item.id}`}
                onClick={() => onSectionChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`sidebar-link w-full mb-0.5 relative group min-h-[44px] ${
                  activeSection === item.id ? 'sidebar-link-active' : 'sidebar-link-inactive'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[hsl(220,15%,88%)] p-2">
        <button
          onClick={() => router.push('/sign-up-login-screen')}
          title={collapsed ? 'Logout' : undefined}
          className={`sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px] ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`sidebar-link w-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 mt-1 min-h-[44px] ${collapsed ? 'justify-center px-2' : 'justify-between'}`}
        >
          {!collapsed && <span className="text-xs">Collapse</span>}
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}