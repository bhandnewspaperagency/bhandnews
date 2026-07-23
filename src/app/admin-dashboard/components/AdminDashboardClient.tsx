'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopbar from './AdminTopbar';
import DashboardOverview from './DashboardOverview';
import DailyBillingEntry from './DailyBillingEntry';
import HawkerRegistry from './HawkerRegistry';
import MonthlyTrackerView from './MonthlyTrackerView';
import ReportsView from './ReportsView';
import RateManagement from './RateManagement';
import TrackerView from './TrackerView';
import CopiesTrackerView from './CopiesTrackerView';
import NewspaperGroups from './NewspaperGroups';
import BackupRestore from './BackupRestore';
import SettingsView from './SettingsView';
import { restoreFromBackupIfNeeded } from '@/lib/storage';

export default function AdminDashboardClient() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [restored, setRestored] = useState(false);

  // On mount: restore any data from IndexedDB backup before rendering content
  useEffect(() => {
    restoreFromBackupIfNeeded().finally(() => setRestored(true));
  }, []);

  const renderContent = () => {
    if (!restored) return null; // wait for backup restore before rendering

    switch (activeSection) {
      case 'dashboard': return <DashboardOverview onNavigate={setActiveSection} />;
      case 'billing': return <DailyBillingEntry />;
      case 'rates': return <RateManagement />;
      case 'hawkers': return <HawkerRegistry />;
      case 'monthly': return <MonthlyTrackerView />;
      case 'tracker': return <TrackerView />;
      case 'copies-tracker': return <CopiesTrackerView />;
      case 'groups': return <NewspaperGroups />;
      case 'reports': return <ReportsView />;
      case 'backup': return <BackupRestore />;
      case 'settings': return <SettingsView />;
      default: return <DashboardOverview onNavigate={setActiveSection} />;
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(220,20%,97%)]">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 lg:z-auto transition-transform duration-300 ease-in-out ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar
          activeSection={activeSection}
          onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-3 py-4 sm:px-6 sm:py-6 xl:px-8 2xl:px-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}