import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Users, 
  BarChart3,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();

  const memberTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'My Leaves', icon: Calendar },
    { id: 'projects', label: 'Projects', icon: BarChart3 },
  ];

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'All Tasks', icon: CheckSquare },
    { id: 'leaves', label: 'All Leaves', icon: Calendar },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Users },
    { id: 'admin-management', label: 'Admin Management', icon: UserPlus },
  ];

  const tabs = user?.role === 'admin' ? adminTabs : memberTabs;

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-screen">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;