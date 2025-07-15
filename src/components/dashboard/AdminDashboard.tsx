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
import { supabase } from '../../lib/supabase';
import { Task } from '../../types';
import { Project } from '../../types';

interface AdminDashboardProps {
  activeTab: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask, filterTasks, refetchTasks } = useTasks();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave, updateLeave } = useLeaves();
  const { projects, loading: projectsLoading, error: projectsError, addProject, updateProject, deleteProject, fetchProjects } = useProjects();
  
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

  const handleStatusChange = (id: string, status: 'not_started' | 'in_progress' | 'completed') => {
    updateTask(id, { status });
  };

  // Add this handler for editing tasks
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    await updateTask(id, updates);
    await refetchTasks();
  };

  async function handleApproveDeclineLeave(leaveId: string, status: 'approved' | 'rejected', userId: string, leaveDate: string, endDate: string | null, leaveType: string) {
    // Update leave status
    await updateLeave(leaveId, { status });
    // Send notification to member
    const isApproved = status === 'approved';
    const notifType = isApproved ? 'leave_approved' : 'leave_rejected';
    const notifTitle = isApproved ? 'Leave Approved' : 'Leave Rejected';
    const leaveDateStr = endDate ? `${new Date(leaveDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : new Date(leaveDate).toLocaleDateString();
    const notifMsg = isApproved
      ? `Your leave request for ${leaveDateStr} (${leaveType}) has been approved.`
      : `Your leave request for ${leaveDateStr} (${leaveType}) has been declined.`;
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: notifTitle,
      message: notifMsg,
      type: notifType,
      related_id: leaveId,
      related_type: 'leave',
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Notification insert error:', error);
      alert('Failed to insert notification: ' + error.message);
    }
  }

  // Move these to the top of the component
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const { error } = await supabase
      .from('admins')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
      })
      .eq('id', user.id);
    setProfileLoading(false);
    if (!error) {
      setEditProfileOpen(false);
      window.location.reload();
    } else {
      alert('Failed to update profile: ' + error.message);
    }
  };

  // Password update handler (dummy, as Supabase Auth is not used)
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setChangePasswordOpen(false);
      alert('Password updated (demo only).');
    }, 1000);
  };

  // Fix: Wrap addTask for TaskForm to match expected signature
  const handleAddTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    await addTask(task as any); // 'as any' to satisfy the type, since addTask expects created_by
  };

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    expected_end_date: ''
  });

  const handleEditProject = (project: Project) => {
    setEditProject(project);
    setEditProjectForm({
      name: project.name,
      description: project.description || '',
      client_name: project.client_name || '',
      start_date: project.start_date || '',
      expected_end_date: project.expected_end_date || ''
    });
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    await updateProject(editProject.id, editProjectForm);
    setEditProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
  };

  if (activeTab === 'dashboard') {
    // Date helpers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    // Recently Completed: completed within last 3 days
    const recentlyCompletedTasks = tasks.filter(task => {
      if (task.status !== 'completed' || !task.updated_at) return false;
      const updated = new Date(task.updated_at);
      const diff = (today.getTime() - updated.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
      return diff <= 3 && diff >= 0;
    });

    // Due Today: due date is today
    const dueTodayTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return isSameDay(due, today);
    });

    // Upcoming: due date is within next 3 days (excluding today)
    const upcomingTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      const diff = (due.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3;
    });

    // Blocked: overdue and not completed
    const blockedTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return due < today && task.status !== 'completed';
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <DashboardStats tasks={tasks} leaves={leaves} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Completed Tasks</h2>
            <div className="space-y-4">
              {recentlyCompletedTasks.length === 0 ? (
                <div className="text-gray-500">No recently completed tasks.</div>
              ) : (
                recentlyCompletedTasks.map(task => (
                  <TaskCard key={task.id} task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} />
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Due Today</h2>
            <div className="space-y-4">
              {dueTodayTasks.length === 0 ? (
                <div className="text-gray-500">No tasks due today.</div>
              ) : (
                dueTodayTasks.map(task => (
                  <TaskCard key={task.id} task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} />
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h2>
            <div className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <div className="text-gray-500">No upcoming tasks.</div>
              ) : (
                upcomingTasks.map(task => (
                  <TaskCard key={task.id} task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} />
                ))
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Blocked Tasks</h2>
            <div className="space-y-4">
              {blockedTasks.length === 0 ? (
                <div className="text-gray-500">No blocked tasks.</div>
              ) : (
                blockedTasks.map(task => (
                  <TaskCard key={task.id} task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} />
                ))
              )}
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
                onUpdate={handleTaskUpdate}
              />
            ))}
          </div>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
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
          <div className="space-y-4">
            {leaves.length === 0 ? (
              <div className="text-gray-500">No leave requests found.</div>
            ) : (
              leaves.map(leave => (
                <div key={leave.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-900">{leave.user?.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-600">{new Date(leave.leave_date).toLocaleDateString()} {leave.end_date ? `- ${new Date(leave.end_date).toLocaleDateString()}` : ''} | {leave.leave_type}</div>
                    <div className="text-xs text-gray-500">Reason: {leave.reason}</div>
                    <div className="text-xs text-gray-500">Status: <span className={leave.status === 'pending' ? 'text-yellow-600' : leave.status === 'approved' ? 'text-green-600' : 'text-red-600'}>{leave.status}</span></div>
                  </div>
                  {leave.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button variant="primary" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'approved', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'rejected', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type)}>Decline</Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
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
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdmin
                  tasks={projectTasks}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onStatusChange={handleStatusChange}
                  onUpdate={handleTaskUpdate}
                />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Project Name"
                value={projectForm.name}
                onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Client Name"
                value={projectForm.client_name}
                onChange={e => setProjectForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Description"
                value={projectForm.description}
                onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Start Date"
                value={projectForm.start_date}
                onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Expected End Date"
                value={projectForm.expected_end_date}
                onChange={e => setProjectForm(f => ({ ...f, expected_end_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Add Project</Button>
            </div>
          </form>
        </Modal>
        {/* Edit Project Modal */}
        <Modal isOpen={!!editProject} onClose={() => setEditProject(null)} title="Edit Project">
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Project Name"
                value={editProjectForm.name}
                onChange={e => setEditProjectForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="Client Name"
                value={editProjectForm.client_name}
                onChange={e => setEditProjectForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                placeholder="Description"
                value={editProjectForm.description}
                onChange={e => setEditProjectForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Start Date"
                value={editProjectForm.start_date}
                onChange={e => setEditProjectForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End Date</label>
              <input
                className="w-full border rounded px-3 py-2"
                type="date"
                placeholder="Expected End Date"
                value={editProjectForm.expected_end_date}
                onChange={e => setEditProjectForm(f => ({ ...f, expected_end_date: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Update Project</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Add profile tab for admin
  if (activeTab === 'profile') {
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
            <div className="flex space-x-2 mt-4">
              <Button variant="primary" onClick={() => setEditProfileOpen(true)}>Edit Profile</Button>
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>Change Password</Button>
            </div>
          </div>
        </Card>
        {/* Edit Profile Modal */}
        <Modal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Name"
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Phone"
              value={profileForm.phone}
              onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
            />
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setEditProfileOpen(false)} type="button">Cancel</Button>
              <Button variant="primary" type="submit" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
        {/* Change Password Modal */}
        <Modal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change Password">
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              placeholder="Current Password"
              value={passwordForm.current}
              onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              placeholder="New Password"
              value={passwordForm.new}
              onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
              required
            />
            <input
              className="w-full border rounded px-3 py-2"
              type="password"
              placeholder="Confirm New Password"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
            <div className="flex space-x-2 justify-end">
              <Button variant="outline" onClick={() => setChangePasswordOpen(false)} type="button">Cancel</Button>
              <Button variant="primary" type="submit" disabled={passwordLoading}>{passwordLoading ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Add admin management tab for admin
  if (activeTab === 'admin-management') {
    // Only Super-Admin can see this section
    if (!user || user.name !== 'Super-Admin' || user.email !== 'admin1@company.com') {
      return (
        <div className="p-8 text-center text-gray-500">You do not have access to this section.</div>
      );
    }
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