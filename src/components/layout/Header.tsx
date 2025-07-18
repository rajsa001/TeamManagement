import React, { useState } from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="danger"
                size="sm"
                icon={LogOut}
                onClick={() => setShowLogoutConfirm(true)}
                className="font-semibold px-4 py-2 rounded shadow hover:bg-red-600 hover:text-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <div className="mb-4 text-lg font-semibold text-gray-800">Are you sure you want to logout?</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={logout}>Logout</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;