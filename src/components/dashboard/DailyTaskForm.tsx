import React, { useState, useEffect } from 'react';
import { DailyTask, Member } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface DailyTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => Promise<void>;
  task?: DailyTask | null;
  members: Member[];
  currentUserId: string;
  isAdmin?: boolean;
}

export const DailyTaskForm: React.FC<DailyTaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  members,
  currentUserId,
  isAdmin = false
}) => {
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
    tags: [] as string[],
    task_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        task_name: task.task_name,
        description: task.description || '',
        priority: task.priority,
        user_id: task.user_id,
        tags: task.tags || [],
        task_date: task.task_date
      });
    } else {
      setFormData({
        task_name: '',
        description: '',
        priority: 'medium',
        user_id: isAdmin ? (members.length > 0 ? members[0].id : currentUserId) : currentUserId,
        tags: [],
        task_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [task, currentUserId, isAdmin, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) return;
    
    // Ensure we have a valid user_id
    if (!formData.user_id || formData.user_id === '') {
      console.error('No valid user selected');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        created_by: currentUserId,
        status: 'pending',
        attachments: [],
        is_active: true
      });
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Daily Task' : 'Create Daily Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Name *
          </label>
          <input
            type="text"
            value={formData.task_name}
            onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task description"
            rows={3}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Member
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={members.length === 0}
            >
              {members.length === 0 ? (
                <option value="">Loading members...</option>
              ) : (
                members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Date
          </label>
          <input
            type="date"
            value={formData.task_date}
            onChange={(e) => setFormData(prev => ({ ...prev, task_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag and press Enter"
            />
            <Button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.task_name.trim() || (isAdmin && members.length === 0)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
