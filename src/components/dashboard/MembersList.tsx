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
  const [editMode, setEditMode] = useState(false);
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
    setEditMode(false);
    setError('');
  };

  const handleEdit = () => {
    setEditMode(true);
    setShowProfile(false);
    // Do not clear selectedMember here!
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
    setEditMode(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600">Manage your team members and their information</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => { setIsFormOpen(true); setEditMode(false); setSelectedMember(null); }}
        >
          Add Member
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <Card key={member.id} hover className="relative cursor-pointer" onClick={() => handleMemberClick(member)}>
            {/* Only show edit/delete for non-admins */}
            {member.department !== undefined && (
              <>
                <button
                  title="Edit Member"
                  className="absolute top-2 left-2 z-10 rounded-full bg-white border border-blue-200 p-1 shadow hover:bg-blue-50 hover:border-blue-400 transition"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedMember(member);
                    setEditMode(true);
                    setShowProfile(false);
                  }}
                >
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  title="Delete Member"
                  className="absolute top-2 right-2 z-10 rounded-full bg-white border border-red-200 p-1 shadow hover:bg-red-50 hover:border-red-400 transition"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedMember(member);
                    setDeleteConfirm(true);
                    setShowProfile(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
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

      {/* Profile Modal */}
      {showProfile && selectedMember && (
        <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Member Profile">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <User className="w-10 h-10 text-blue-600" />
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
              <Button icon={Edit2} onClick={handleEdit}>
                Update
              </Button>
              <Button icon={Trash2} variant="danger" onClick={() => setDeleteConfirm(true)}>
                Delete
              </Button>
            </div>
            {/* Delete Confirmation */}
            {deleteConfirm && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                <div className="mb-2 text-red-700">Are you sure you want to delete this member?</div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
                  <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Member Modal (always accessible) */}
      {editMode && selectedMember && (
        <MemberForm
          isOpen={editMode}
          onClose={() => setEditMode(false)}
          onSuccess={handleUpdate}
          initialData={selectedMember}
        />
      )}

      <MemberForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleMemberCreated}
      />

      {/* Delete Confirmation Modal (always accessible) */}
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