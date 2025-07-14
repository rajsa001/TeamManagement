import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Plus } from 'lucide-react';
import { Member } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import MemberForm from './MemberForm';

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const membersData = await authService.getMembers();
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleMemberCreated = () => {
    loadMembers();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => setIsFormOpen(true)}
        >
          Add Member
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <Card key={member.id} hover>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {member.name}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {member.email}
                </div>
                
                {member.phone && (
                  <div className="flex items-center justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {member.phone}
                  </div>
                )}
                
                {member.department && (
                  <div className="flex items-center justify-center">
                    <Building className="w-4 h-4 mr-2" />
                    {member.department}
                  </div>
                )}
                
                {member.hire_date && (
                  <div className="flex items-center justify-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined {new Date(member.hire_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-center">
                <Badge variant={member.is_active ? 'success' : 'secondary'}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first team member</p>
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
          >
            Add First Member
          </Button>
        </div>
      )}

      <MemberForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleMemberCreated}
      />
    </div>
  );
};

export default MembersList;