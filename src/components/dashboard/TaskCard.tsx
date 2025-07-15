import React, { useState } from 'react';
import { Calendar, User, Trash2, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  showUser?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDelete, 
  onStatusChange, 
  onUpdate,
  showUser = false 
}) => {
  const { user } = useAuth();
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    task_name: task.task_name,
    description: task.description,
    status: task.status as Task['status'],
  });

  const getStatusVariant = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Calendar;
      case 'not_started': return AlertCircle;
      default: return Calendar;
    }
  };

  const StatusIcon = getStatusIcon(task.status);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate(task.id, editData);
    }
    setIsEditOpen(false);
  };

  return (
    <Card className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`} hover>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
          <p className="text-sm text-gray-600">{task.description}</p>
          {task.project && (
            <div className="text-xs text-blue-700 mt-1">Project: {task.project.name}</div>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          {(user?.role === 'admin' || task.user_id === user?.id) && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={() => onDelete(task.id)}
              className="text-red-500 hover:text-red-700"
            />
          )}
          {(user?.role === 'admin' || task.user_id === user?.id) && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setIsEditOpen(true)}
              className="text-blue-500 hover:text-blue-700"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-full">
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Due Date:</span>
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Status:</span>
            <Badge variant={getStatusVariant(task.status)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {task.status}
            </Badge>
            {task.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(task.id, 'completed')}
                className="text-green-600 hover:text-green-700 ml-2"
              >
                Complete
              </Button>
            )}
          </div>
          {(showUser && task.user) || (user?.role === 'admin' && task.user) ? (
            <div className="text-sm text-gray-700 mb-1 flex items-center">
              <span className="font-semibold mr-1">Assigned to:</span>
              <User className="w-4 h-4 mr-1" />
              {task.user.name}
            </div>
          ) : null}
        </div>
      </div>

      {isOverdue && (
        <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          This task is overdue
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
              <input
                type="text"
                name="task_name"
                value={editData.task_name}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={editData.description}
                onChange={handleEditChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={editData.status}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
};

export default TaskCard;