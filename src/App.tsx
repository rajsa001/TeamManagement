import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/auth/LandingPage';
import LoginForm from './components/auth/LoginForm';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MemberDashboard from './components/dashboard/MemberDashboard';
import AdminDashboard from './components/dashboard/AdminDashboard';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    if (selectedRole) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoginForm
            role={selectedRole}
            onBack={() => setSelectedRole(null)}
          />
        </div>
      );
    }

    return <LandingPage onSelectRole={setSelectedRole} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6">
          {user.role === 'admin' ? (
            <AdminDashboard activeTab={activeTab} />
          ) : (
            <MemberDashboard activeTab={activeTab} />
          )}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;