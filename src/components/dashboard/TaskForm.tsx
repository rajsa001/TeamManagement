import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    due_date: '',
    user_id: user?.id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'pending' as const,
    });
    setFormData({ task_name: '', description: '', due_date: '', user_id: user?.id || '' });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
          />
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