import React from 'react';
import { Shield, Users, CheckCircle, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'member') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 text-white p-4 rounded-full">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TaskFlow
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your team's task management and leave tracking with our comprehensive solution
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center" hover>
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Management</h3>
            <p className="text-gray-600">
              Create, track, and manage tasks with deadlines and status updates
            </p>
          </Card>

          <Card className="text-center" hover>
            <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Management</h3>
            <p className="text-gray-600">
              Plan and track team leaves with an intuitive calendar interface
            </p>
          </Card>

          <Card className="text-center" hover>
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Collaboration</h3>
            <p className="text-gray-600">
              Enhance team productivity with role-based access and oversight
            </p>
          </Card>
        </div>

        {/* Login Options */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Choose Your Access Level
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="text-center" hover>
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Access</h3>
              <p className="text-gray-600 mb-6">
                Full control over team tasks, leaves, and member management
              </p>
              <div className="text-xs text-gray-500 mb-4">
                Demo: admin@company.com / password123
              </div>
              <Button
                onClick={() => onSelectRole('admin')}
                className="w-full"
                variant="primary"
              >
                Login as Admin
              </Button>
            </Card>

            <Card className="text-center" hover>
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Member</h3>
              <p className="text-gray-600 mb-6">
                Manage your personal tasks and leave requests
              </p>
              <div className="text-xs text-gray-500 mb-4">
                Demo: john@company.com / password123
              </div>
              <Button
                onClick={() => onSelectRole('member')}
                className="w-full"
                variant="secondary"
              >
                Login as Member
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;