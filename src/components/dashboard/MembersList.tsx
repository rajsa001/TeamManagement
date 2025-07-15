import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { Member } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import MemberForm from './MemberForm';
import Modal from '../ui/Modal';

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

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

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setShowProfile(true);
    setError('');
  };

  // Open add member modal
  const handleAddMember = () => {
    setIsFormOpen(true);
    setSelectedMember(null);
    setShowProfile(false);
  };

  // Open edit member modal
  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setIsFormOpen(true);
    setShowProfile(false);
  };

  // Open delete confirmation
  const handleDeleteConfirm = (member: Member) => {
    setSelectedMember(member);
    setDeleteConfirm(true);
    setShowProfile(false);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setError('');
    try {
      await authService.deleteMember(selectedMember.id);
      setShowProfile(false);
      setDeleteConfirm(false);
      setSelectedMember(null);
      loadMembers();
    } catch (err) {
      setError('Failed to delete member');
    }
  };

  const handleUpdate = () => {
    setSelectedMember(null);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <Button
          icon={Plus}
          onClick={handleAddMember}
        >
          Add Member
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <Card
            key={member.id}
            hover
            className="relative cursor-pointer"
            onClick={() => handleMemberClick(member)}
          >
            {member.department !== undefined && (
              <>
                <button
                  title="Edit Member"
                  className="absolute top-2 left-2 z-10 bg-white border p-1 shadow"
                  onClick={e => {
                    e.stopPropagation();
                    handleEditMember(member);
                  }}
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  title="Delete Member"
                  className="absolute top-2 right-2 z-10 bg-white border p-1 shadow"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteConfirm(member);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100 overflow-hidden">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="Profile" className="w-16 h-16 object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <div>{member.email}</div>
                {member.phone && <div>{member.phone}</div>}
                {member.department && <div>{member.department}</div>}
                {member.hire_date && <div>Joined {new Date(member.hire_date).toLocaleDateString()}</div>}
              </div>
              <div className="mt-2">
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
            onClick={handleAddMember}
          >
            Add First Member
          </Button>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && selectedMember && (
        <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Member Profile">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {selectedMember.avatar_url ? (
                  <img src={selectedMember.avatar_url} alt="Profile" className="w-12 h-12 object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{selectedMember.name}</div>
                <div className="text-sm text-gray-600">{selectedMember.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                <div className="text-sm text-gray-900">{selectedMember.phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Department</div>
                <div className="text-sm text-gray-900">{selectedMember.department || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Hire Date</div>
                <div className="text-sm text-gray-900">{selectedMember.hire_date ? new Date(selectedMember.hire_date).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Active</div>
                <div className="text-sm text-gray-900">{selectedMember.is_active ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Created At</div>
                <div className="text-sm text-gray-900">{selectedMember.created_at ? new Date(selectedMember.created_at).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Updated At</div>
                <div className="text-sm text-gray-900">{selectedMember.updated_at ? new Date(selectedMember.updated_at).toLocaleDateString() : '-'}</div>
              </div>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex justify-end space-x-3 pt-4">
              <Button icon={Edit2} onClick={() => handleEditMember(selectedMember)}>
                Update
              </Button>
              <Button icon={Trash2} variant="danger" onClick={() => handleDeleteConfirm(selectedMember)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Member Form Modal (add/edit) */}
      {isFormOpen && (
        <MemberForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setSelectedMember(null); }}
          onSuccess={handleMemberCreated}
          initialData={selectedMember || undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && selectedMember && (
        <Modal isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Member">
          <div>Are you sure you want to delete {selectedMember.name}?</div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MembersList;