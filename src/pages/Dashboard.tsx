
import React from 'react';
import Header from '@/components/Header';
import DashboardPage from '@/components/dashboard/DashboardPage';

const Dashboard = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <DashboardPage />
      </main>
      <footer className="bg-secondary py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs text-muted-foreground">
            ClearSkies Community Air Quality Monitoring Platform • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
