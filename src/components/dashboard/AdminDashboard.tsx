import React, { useState } from 'react';
import { Plus, Users, BarChart3, UserPlus } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';
import MembersList from './MembersList';
import AdminsList from './AdminsList';
import { useAuth } from '../../contexts/AuthContext';
import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';
import Modal from '../ui/Modal';

interface AdminDashboardProps {
  activeTab: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave } = useLeaves();
  const { projects, loading: projectsLoading, error: projectsError, addProject } = useProjects();
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    expected_end_date: ''
  });

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'pending' | 'completed' | 'blocked') => {
    updateTask(id, { status });
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
                  showUser={true}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leave Requests</h2>
            <div className="space-y-2">
              {leaves.slice(0, 3).map(leave => (
                <div key={leave.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {leave.user?.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(leave.leave_date).toLocaleDateString()} - {leave.leave_type}
                      </p>
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
          <h1 className="text-2xl font-bold text-gray-900">All Tasks</h1>
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
          showMemberFilter={true}
        />

        {tasksError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {tasksError}
          </div>
        )}

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
                showUser={true}
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
          <h1 className="text-2xl font-bold text-gray-900">Team Leaves</h1>
        </div>

        {leavesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <LeaveCalendar
            leaves={leaves}
            onAddLeave={addLeave}
            showUserInfo={true}
          />
        )}
      </div>
    );
  }

  if (activeTab === 'team') {
    return (
      <MembersList />
    );
  }

  if (activeTab === 'reports') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Rate</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span>{tasks.filter(t => t.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending</span>
                <span>{tasks.filter(t => t.status === 'pending').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Blocked</span>
                <span>{tasks.filter(t => t.status === 'blocked').length}</span>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Casual Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'casual').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sick Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'sick').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid Leaves</span>
                <span>{leaves.filter(l => l.leave_type === 'paid').length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === 'projects') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <Button icon={Plus} onClick={() => setIsProjectFormOpen(true)}>
            Add Project
          </Button>
        </div>
        {projectsError && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{projectsError}</div>}
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => {
              const projectTasks = tasks.filter(task => task.project_id === project.id);
              return (
                <ProjectCard key={project.id} project={project} isAdmin tasks={projectTasks} />
              );
            })}
          </div>
        )}
        <Modal isOpen={isProjectFormOpen} onClose={() => setIsProjectFormOpen(false)} title="Add Project">
          <form
            onSubmit={e => {
              e.preventDefault();
              addProject(projectForm);
              setIsProjectFormOpen(false);
              setProjectForm({ name: '', description: '', client_name: '', start_date: '', expected_end_date: '' });
            }}
            className="space-y-4"
          >
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Project Name"
              value={projectForm.name}
              onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Client Name"
              value={projectForm.client_name}
              onChange={e => setProjectForm(f => ({ ...f, client_name: e.target.value }))}
            />
            <textarea
              className="w-full border rounded px-3 py-2"
              placeholder="Description"
              value={projectForm.description}
              onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="date"
              placeholder="Start Date"
              value={projectForm.start_date}
              onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="date"
              placeholder="Expected End Date"
              value={projectForm.expected_end_date}
              onChange={e => setProjectForm(f => ({ ...f, expected_end_date: e.target.value }))}
            />
            <Button type="submit">Add Project</Button>
          </form>
        </Modal>
      </div>
    );
  }

  // Add profile tab for admin
  if (activeTab === 'profile') {
    const { user } = useAuth();
    if (!user || user.role !== 'admin') return null;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
        </div>
        <Card className="max-w-md mx-auto p-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-2">
              <span className="text-3xl font-bold text-blue-600">{user.name.charAt(0)}</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
            <div className="text-gray-700">{user.email}</div>
            {user.phone && <div className="text-gray-700">Phone: {user.phone}</div>}
            <div className="text-gray-700">Status: <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>{user.is_active ? 'Active' : 'Inactive'}</span></div>
            <div className="text-gray-500 text-sm">Created: {new Date(user.created_at).toLocaleDateString()}</div>
            <div className="text-gray-500 text-sm">Updated: {new Date(user.updated_at).toLocaleDateString()}</div>
          </div>
        </Card>
      </div>
    );
  }

  // Add admin management tab for admin
  if (activeTab === 'admin-management') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
        </div>
        <AdminsList />
      </div>
    );
  }

  return null;
};

export default AdminDashboard;