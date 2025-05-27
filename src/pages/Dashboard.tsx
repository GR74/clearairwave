
import React from 'react';
import Header from '@/components/Header';
import DashboardPage from '@/components/dashboard/DashboardPage';
import Footer from '@/components/Footer'


const Dashboard = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <DashboardPage />
      </main>
      <Footer/>
    </div>
  );
};

export default Dashboard;

