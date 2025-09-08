import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, User, Tag, Eye, AlertTriangle } from 'lucide-react';
import { DeletedTask } from '../../types';
import { deletedTasksService } from '../../services/deletedTasks';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const DeletedTasksPage: React.FC = () => {
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<DeletedTask | null>(null);
  const [stats, setStats] = useState({
    totalDeleted: 0,
    deletedToday: 0,
    deletedThisWeek: 0,
    deletedThisMonth: 0,
    byType: { regular: 0, daily: 0 }
  });

  useEffect(() => {
    fetchDeletedTasks();
    fetchStats();
  }, []);

  const fetchDeletedTasks = async () => {
    try {
      setLoading(true);
      const tasks = await deletedTasksService.getDeletedTasks({ limit: 100 });
      setDeletedTasks(tasks);
    } catch (err) {
      setError('Failed to fetch deleted tasks');
      console.error('Error fetching deleted tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statistics = await deletedTasksService.getDeletedTaskStats();
      setStats(statistics);
    } catch (err) {
      console.error('Error fetching deleted task stats:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskTypeColor = (taskType: string) => {
    return taskType === 'daily' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deleted tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Deleted Tasks</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={fetchDeletedTasks}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Trash2 className="w-6 h-6 mr-3 text-red-600" />
            Deleted Tasks
          </h1>
          <p className="text-gray-600 mt-1">View and audit deleted tasks</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Deleted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDeleted}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Deleted Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedToday}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedThisWeek}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deletedThisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Task Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Task Type Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Regular Tasks</span>
              <Badge variant="secondary" className={getTaskTypeColor('regular')}>
                {stats.byType.regular}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Daily Tasks</span>
              <Badge variant="secondary" className={getTaskTypeColor('daily')}>
                {stats.byType.daily}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Deleted Tasks List */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Deleted Tasks</h2>
          
          {deletedTasks.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Deleted Tasks</h3>
              <p className="text-gray-500">No tasks have been deleted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deletedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{task.task_name}</h3>
                        <Badge variant="secondary" className={getTaskTypeColor(task.task_type)}>
                          {task.task_type === 'daily' ? 'Daily Task' : 'Regular Task'}
                        </Badge>
                        {task.priority && (
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Deleted: {formatDate(task.deleted_at)}
                        </div>
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          Deleted by: {task.deleted_by}
                        </div>
                        {task.due_date && (
                          <div className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTask(task)}
                      className="ml-4"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Deleted Task Details"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Task Name</label>
              <p className="text-sm text-gray-900 font-medium">{selectedTask.task_name}</p>
            </div>

            {selectedTask.description && (
              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm text-gray-900">{selectedTask.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Task Type</label>
                <p className="text-sm text-gray-900 capitalize">
                  {selectedTask.task_type === 'daily' ? 'Daily Task' : 'Regular Task'}
                </p>
              </div>
              
              {selectedTask.priority && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedTask.priority}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Assigned To</label>
                <p className="text-sm text-gray-900">{selectedTask.user_id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Created By</label>
                <p className="text-sm text-gray-900">{selectedTask.created_by}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Deleted By</label>
                <p className="text-sm text-gray-900">{selectedTask.deleted_by}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">Deleted At</label>
                <p className="text-sm text-gray-900">{formatDate(selectedTask.deleted_at)}</p>
              </div>
            </div>

            {selectedTask.due_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {selectedTask.task_type === 'daily' ? 'Task Date' : 'Due Date'}
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedTask.due_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {selectedTask.tags && selectedTask.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTask.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DeletedTasksPage;
