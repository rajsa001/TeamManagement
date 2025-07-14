import React from 'react';
import { LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

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
                variant="ghost"
                size="sm"
                icon={Settings}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={LogOut}
                onClick={logout}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;