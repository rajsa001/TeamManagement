import React from 'react';
import { Calendar, User, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  showUser?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onDelete, 
  onStatusChange, 
  showUser = false 
}) => {
  const { user } = useAuth();
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'completed';

  const getStatusVariant = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'blocked': return 'danger';
      default: return 'warning';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'blocked': return AlertCircle;
      default: return Calendar;
    }
  };

  const StatusIcon = getStatusIcon(task.status);

  return (
    <Card className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`} hover>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
          <p className="text-sm text-gray-600">{task.description}</p>
        </div>
        {(user?.role === 'admin' || task.user_id === user?.id) && (
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => onDelete(task.id)}
            className="text-red-500 hover:text-red-700"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
          {showUser && task.user && (
            <div className="flex items-center text-sm text-gray-500">
              <User className="w-4 h-4 mr-1" />
              {task.user.name}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={getStatusVariant(task.status)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {task.status}
          </Badge>
          {task.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(task.id, 'completed')}
              className="text-green-600 hover:text-green-700"
            >
              Complete
            </Button>
          )}
        </div>
      </div>

      {isOverdue && (
        <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          This task is overdue
        </div>
      )}
    </Card>
  );
};

export default TaskCard;