'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminTopbar from './AdminTopbar';
import DashboardOverview from './DashboardOverview';
import DailyBillingEntry from './DailyBillingEntry';
import HawkerRegistry from './HawkerRegistry';
import MonthlyTrackerView from './MonthlyTrackerView';
import ReportsView from './ReportsView';
import RateManagement from './RateManagement';
import TrackerView from './TrackerView';
import NewspaperGroups from './NewspaperGroups';

export default function AdminDashboardClient() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardOverview onNavigate={setActiveSection} />;
      case 'billing': return <DailyBillingEntry />;
      case 'rates': return <RateManagement />;
      case 'hawkers': return <HawkerRegistry />;
      case 'monthly': return <MonthlyTrackerView />;
      case 'tracker': return <TrackerView />;
      case 'groups': return <NewspaperGroups />;
      case 'reports': return <ReportsView />;
      default: return <DashboardOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(220,20%,97%)]">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar activeSection={activeSection} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-6 py-6 xl:px-8 2xl:px-10">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}