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
  section?: 'completed' | 'today' | 'upcoming' | 'blocked'; // NEW
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDelete, 
  onStatusChange, 
  onUpdate,
  showUser = false,
  section // NEW
}) => {
  const { user } = useAuth();
  // Helper to check if a date is before today
  const isBeforeToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  const dueDate = new Date(task.due_date);
  const isOverdue = isBeforeToday(dueDate) && task.status !== 'completed';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    task_name: task.task_name,
    description: task.description,
    status: task.status as Task['status'],
  });
  // Local state for progress input
  const [progressInput, setProgressInput] = useState(task.progress);
  React.useEffect(() => { setProgressInput(task.progress); }, [task.progress]);
  // Overdue warning popover state
  const [showOverdue, setShowOverdue] = useState(false);

  // Handle progress input change
  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(100, val));
    setProgressInput(val);
  };
  // Commit progress on blur or Enter
  const commitProgress = () => {
    if (progressInput !== task.progress && onUpdate) {
      onUpdate(task.id, { progress: progressInput });
    }
  };
  const handleProgressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

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

  // Section-based border gradient and accent color
  let borderClass = '';
  let accentColor = '';
  switch (section || task.status) {
    case 'completed':
      borderClass = 'border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100';
      accentColor = 'border-green-500';
      break;
    case 'today':
      borderClass = 'border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100';
      accentColor = 'border-orange-500';
      break;
    case 'upcoming':
      borderClass = 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100';
      accentColor = 'border-blue-500';
      break;
    case 'blocked':
      borderClass = 'border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100';
      accentColor = 'border-red-500';
      break;
    case 'in_progress':
      borderClass = 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100';
      accentColor = 'border-yellow-500';
      break;
    case 'pending':
      borderClass = 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100';
      accentColor = 'border-blue-500';
      break;
    case 'not_started':
      accentColor = 'border-gray-400';
      break;
    default:
      borderClass = '';
      accentColor = '';
  }

  return (
    <Card
      className={`flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden ${borderClass} ${isOverdue && !section ? 'border-red-200 bg-red-50' : ''} group transition-all duration-200`}
      hover
      animated
      accentColor={accentColor}
      padding="md"
    >
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 mb-1 group-hover:text-blue-700 transition-colors duration-200 truncate">{task.task_name}</h3>
          <p className="text-sm text-gray-600 mb-1 line-clamp-2 break-words">{task.description}</p>
          {task.project && (
            <div className="text-xs text-blue-700 mt-1 truncate">Project: {task.project.name}</div>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1 flex-shrink-0">
          {(user?.role === 'admin' || task.user_id === user?.id) && (
            <div className="flex items-center gap-1">
              {/* Overdue warning icon (now next to delete button) */}
              {isOverdue && section !== 'today' && (
                <button
                  type="button"
                  className="p-1 rounded-full bg-red-100 hover:bg-red-200 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                  onClick={() => setShowOverdue(v => !v)}
                  title="Show overdue warning"
                  tabIndex={0}
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => onDelete(task.id)}
                className="text-red-500 hover:text-red-700 focus:ring-2 focus:ring-red-200 rounded-full"
              />
            </div>
          )}
          {(user?.role === 'admin' || task.user_id === user?.id) && onUpdate && (
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setIsEditOpen(true)}
              className="text-blue-500 hover:text-blue-700 focus:ring-2 focus:ring-blue-200 rounded-full"
            />
          )}
        </div>
        {/* Overdue warning popover */}
        {isOverdue && section !== 'today' && showOverdue && (
          <div className="absolute top-10 right-0 z-20 bg-red-100 border border-red-300 rounded shadow p-2 text-sm text-red-700 w-48 max-w-xs overflow-hidden">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">This task is overdue</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="w-full">
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Due Date:</span>
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-700 mb-1 flex items-center">
            <span className="font-semibold mr-1">Status:</span>
            <Badge variant={getStatusVariant(task.status)} className="px-3 py-1 text-base font-semibold shadow-sm animate-pulse">
              <StatusIcon className="w-4 h-4 mr-1" />
              {task.status}
            </Badge>
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

      {/* Progress input and bar for in-progress tasks */}
      {task.status === 'in_progress' && (user?.role === 'admin' || task.user_id === user?.id) && onUpdate && (
        <div className="mb-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Progress</span>
            <input
              type="number"
              min={0}
              max={100}
              value={progressInput}
              onChange={handleProgressInputChange}
              onBlur={commitProgress}
              onKeyDown={handleProgressKeyDown}
              className="w-16 text-center border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
            <span className="text-xs text-gray-700 font-semibold">%</span>
          </div>
          <div className="relative h-2 w-full bg-yellow-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-yellow-400 transition-all duration-500"
              style={{ width: `${progressInput}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Complete button for all tasks except completed */}
      {task.status !== 'completed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatusChange(task.id, 'completed')}
          className="w-full mt-2 text-green-700 border-green-400 hover:bg-green-50 hover:border-green-600"
        >
          Mark as Complete
        </Button>
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