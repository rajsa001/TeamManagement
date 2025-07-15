import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Plus, Trash2, Edit2 } from 'lucide-react';
import { Admin } from '../../types';
import { authService } from '../../services/auth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

const AdminsList: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminsData = await authService.getAdmins();
      setAdmins(adminsData);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAdminCreated = () => {
    loadAdmins();
  };

  const handleAdminClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditMode(false);
    setError('');
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleDelete = async () => {
    if (!selectedAdmin) return;
    setError('');
    try {
      await authService.deleteAdmin(selectedAdmin.id);
      setDeleteConfirm(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (err) {
      setError('Failed to delete admin');
    }
  };

  const handleUpdate = () => {
    setEditMode(false);
    setSelectedAdmin(null);
    loadAdmins();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admins</h2>
          <p className="text-gray-600">Manage your admins and their information</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => { setIsFormOpen(true); setEditMode(false); setSelectedAdmin(null); }}
        >
          Add Admin
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading admins...</p>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No admins yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first admin</p>
          <Button
            icon={Plus}
            onClick={() => setIsFormOpen(true)}
          >
            Add First Admin
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {admins.map((admin) => (
            <Card key={admin.id} hover className="relative cursor-pointer" onClick={() => handleAdminClick(admin)}>
              <button
                title="Edit Admin"
                className="absolute top-2 left-2 z-10 rounded-full bg-white border border-blue-200 p-1 shadow hover:bg-blue-50 hover:border-blue-400 transition"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedAdmin(admin);
                  setEditMode(true);
                }}
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
              </button>
              <button
                title="Delete Admin"
                className="absolute top-2 right-2 z-10 rounded-full bg-white border border-red-200 p-1 shadow hover:bg-red-50 hover:border-red-400 transition"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedAdmin(admin);
                  setDeleteConfirm(true);
                }}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {admin.avatar_url ? (
                  <img src={admin.avatar_url} alt="Profile" className="w-16 h-16 object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {admin.name}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {admin.email}
                </div>
                {admin.phone && (
                  <div className="flex items-center justify-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {admin.phone}
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${admin.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {admin.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TODO: Add AdminForm and Modal for add/edit functionality */}
      {/* TODO: Add Delete Confirmation Modal */}
    </div>
  );
};

export default AdminsList; 