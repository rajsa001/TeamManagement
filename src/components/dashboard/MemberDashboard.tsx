import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';

interface MemberDashboardProps {
  activeTab: string;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave } = useLeaves();
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'pending' | 'completed' | 'blocked') => {
    updateTask(id, { status });
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        </div>
        
        <DashboardStats tasks={tasks} leaves={leaves} />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h2>
            <div className="space-y-4">
              {tasks.slice(0, 3).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={deleteTask}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Leaves</h2>
            <div className="space-y-2">
              {leaves.slice(0, 3).map(leave => (
                <div key={leave.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(leave.leave_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">{leave.leave_type} leave</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {leave.leave_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <Button
            icon={Plus}
            onClick={() => setIsTaskFormOpen(true)}
          >
            Add Task
          </Button>
        </div>

        <TaskFiltersComponent
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
        />

        {tasksLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={addTask}
        />
      </div>
    );
  }

  if (activeTab === 'leaves') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        </div>

        {leavesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <LeaveCalendar
            leaves={leaves}
            onAddLeave={addLeave}
          />
        )}
      </div>
    );
  }

  return null;
};

export default MemberDashboard;