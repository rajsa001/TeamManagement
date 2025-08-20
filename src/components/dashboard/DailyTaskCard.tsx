import React from 'react';
import { DailyTask } from '../../types';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface DailyTaskCardProps {
  task: DailyTask;
  onStatusChange: (id: string, status: 'pending' | 'completed' | 'skipped') => void;
  onEdit?: (task: DailyTask) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'skipped':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-blue-500 text-white';
    case 'low':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const DailyTaskCard: React.FC<DailyTaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  const handleStatusChange = (newStatus: 'pending' | 'completed' | 'skipped') => {
    onStatusChange(task.id, newStatus);
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      task.status === 'completed' ? 'opacity-75' : ''
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className={`font-semibold text-lg mb-1 ${
              task.status === 'completed' ? 'line-through text-gray-600' : 'text-gray-900'
            }`}>
              {task.task_name}
            </h3>
            {task.description && (
              <p className={`text-sm mb-2 ${
                task.status === 'completed' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div>
            <span className="font-medium">Assigned to:</span> {task.user?.name || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Date:</span> {new Date(task.task_date).toLocaleDateString()}
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {task.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Mark Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('skipped')}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Skip
                </Button>
              </>
            )}
            {task.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              >
                Mark Pending
              </Button>
            )}
            {task.status === 'skipped' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
              >
                Mark Pending
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(task)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(task.id)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {task.completed_at && (
          <div className="mt-2 text-xs text-gray-500">
            Completed at: {new Date(task.completed_at).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
};
