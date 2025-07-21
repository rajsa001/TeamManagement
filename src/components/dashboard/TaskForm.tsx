import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Task, Member } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { authService } from '../../services/auth';
import { useProjects } from '../../hooks/useProjects';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  initialProjectId?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSubmit, initialProjectId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    due_date: '',
    user_id: user?.id || '',
    project_id: initialProjectId || '',
    status: 'pending' as Task['status'],
    progress: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const { projects, loading: projectsLoading } = useProjects();

  useEffect(() => {
    if (user?.role === 'admin') {
      setMembersLoading(true);
      setMembersError('');
      authService.getMembers()
        .then(data => {
          setMembers(data);
          // If modal is open and user_id is empty, set to first member's ID
          if (isOpen && data.length > 0 && !formData.user_id) {
            setFormData(prev => ({ ...prev, user_id: data[0].id }));
          }
          console.log('Fetched members:', data);
        })
        .catch(err => {
          setMembersError('Failed to load members');
          setMembers([]);
        })
        .finally(() => setMembersLoading(false));
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && user?.role === 'member') {
      setFormData(prev => ({ ...prev, user_id: user.id }));
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && initialProjectId) {
      setFormData(prev => ({ ...prev, project_id: initialProjectId }));
    }
  }, [isOpen, initialProjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseTask = {
      ...formData,
      created_by: formData.user_id,
    };
    onSubmit(baseTask);
    setFormData({ task_name: '', description: '', due_date: '', user_id: user?.id || '', project_id: '', status: 'pending', progress: 0 });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name
          </label>
          <input
            type="text"
            name="task_name"
            value={formData.task_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={todayStr}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {user?.role === 'admin' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            {membersLoading ? (
              <div className="text-sm text-gray-500">Loading members...</div>
            ) : membersError ? (
              <div className="text-sm text-red-500">{membersError}</div>
            ) : members.length === 0 ? (
              <div className="text-sm text-gray-500">No members found. Please add members first.</div>
            ) : (
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Member</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.name} ({member.email})</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          {projectsLoading ? (
            <div className="text-sm text-gray-500">Loading projects...</div>
          ) : (
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!!initialProjectId}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Add Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskForm;