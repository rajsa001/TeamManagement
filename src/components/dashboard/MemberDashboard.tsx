import React, { useState } from 'react';
import { Plus, User, Bell } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { useAuth } from '../../contexts/AuthContext';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';
import Modal from '../ui/Modal';
import LeaveForm from './LeaveForm';
import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';

interface MemberDashboardProps {
  activeTab: string;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { leaves, loading: leavesLoading, error: leavesError, addLeave, updateLeave, deleteLeave } = useLeaves();
  const { user } = useAuth();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});
  const [showProfile, setShowProfile] = useState(false);
  const [editLeave, setEditLeave] = useState(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Add departments list for dropdown
  const departments = [
    'Engineering', 'Design', 'Marketing', 'Sales',
    'HR', 'Finance', 'Operations', 'Customer Support'
  ];
  // Add avatar upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Helper to get/set dismissed notifications in localStorage
  const getDismissedNotifications = () => {
    if (!user?.id) return [];
    try {
      return JSON.parse(localStorage.getItem(`dismissedNotifications_${user.id}`) || '[]');
    } catch {
      return [];
    }
  };
  const addDismissedNotification = (notifId: string) => {
    if (!user?.id) return;
    const dismissed = getDismissedNotifications();
    if (!dismissed.includes(notifId)) {
      localStorage.setItem(
        `dismissedNotifications_${user.id}`,
        JSON.stringify([...dismissed, notifId])
      );
    }
  };

  // Update handleRemoveNotification to use local dismissal
  const handleRemoveNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    const userId = user?.id;
    console.log('Attempting to delete notification:', { id, notif, userId });
    // Try to delete from Supabase (will fail silently if not allowed)
    await supabase.from('notifications').delete().eq('id', id);
    // Always locally dismiss
    addDismissedNotification(id);
    setNotifications(notifications => notifications.filter(n => n.id !== id));
  };

  // Fetch notifications for the logged-in member, filter out dismissed
  React.useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setNotificationsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const dismissed = getDismissedNotifications();
        setNotifications(data.filter(n => !dismissed.includes(n.id)));
      }
      setNotificationsLoading(false);
    };
    fetchNotifications();

    // --- Real-time notifications subscription ---
    if (!user) return;
    const channel = supabase.channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime notification event received:', payload);
          if (payload.new) {
            const dismissed = getDismissedNotifications();
            if (!dismissed.includes(payload.new.id)) {
              setNotifications((prev) => [payload.new, ...prev]);
            }
          } else {
            // Fallback: refetch notifications if payload is missing
            fetchNotifications();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscribed to notifications realtime:', status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END real-time ---
  }, [user]);

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'pending' | 'completed' | 'blocked') => {
    updateTask(id, { status });
  };

  const handleEditLeave = (leave) => {
    setEditLeave(leave);
    setEditFormOpen(true);
  };

  const handleUpdateLeave = (updatedLeave) => {
    if (!updatedLeave.id) {
      alert('Leave ID is missing. Cannot update.');
      return;
    }
    updateLeave(updatedLeave.id, {
      leave_date: updatedLeave.leave_date,
      end_date: updatedLeave.end_date,
      leave_type: updatedLeave.leave_type,
      reason: updatedLeave.reason,
      category: updatedLeave.category,
      from_date: updatedLeave.from_date,
      to_date: updatedLeave.to_date,
      brief_description: updatedLeave.brief_description,
      status: updatedLeave.status,
    });
    setEditFormOpen(false);
    setEditLeave(null);
  };

  const handleDeleteLeave = (id) => {
    deleteLeave(id);
    setDeleteLeaveId(null);
    setDeleteConfirmOpen(false);
  };

  const confirmDeleteLeave = () => {
    if (deleteLeaveId) {
      deleteLeave(deleteLeaveId);
      setDeleteLeaveId(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    let avatar_url = user.avatar_url;
    if (avatarFile) {
      setAvatarUploading(true);
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
      setAvatarUploading(false);
      if (uploadError) {
        alert('Failed to upload avatar: ' + uploadError.message);
        setProfileLoading(false);
        return;
      }
      avatar_url = data?.path ? supabase.storage.from('avatars').getPublicUrl(data.path).publicUrl : user.avatar_url;
    }
    const { error } = await supabase
      .from('members')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
        department: profileForm.department,
        hire_date: profileForm.hire_date,
        avatar_url,
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
    // If using Supabase Auth, call updateUser. Here, just close modal.
    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setChangePasswordOpen(false);
      alert('Password updated (demo only).');
    }, 1000);
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
                  // Do not pass onUpdate here to hide edit button
                />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Leaves</h2>
            <div className="space-y-2">
              {leaves
                .filter(leave => {
                  // Only show leaves that are today or in the future (for single-day), or multi-day leaves that end today or later
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  if (leave.category === 'multi-day' && leave.to_date) {
                    return new Date(leave.to_date) >= today;
                  } else if (leave.leave_date) {
                    return new Date(leave.leave_date) >= today;
                  }
                  return false;
                })
                .sort((a, b) => {
                  // Sort by start date
                  const aDate = a.category === 'multi-day' ? new Date(a.from_date ?? '') : new Date(a.leave_date ?? '');
                  const bDate = b.category === 'multi-day' ? new Date(b.from_date ?? '') : new Date(b.leave_date ?? '');
                  return aDate.getTime() - bDate.getTime();
                })
                .slice(0, 3)
                .map(leave => (
                  <Card key={leave.id} className="bg-white border border-gray-200">
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900 text-base">{leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'} Leave</div>
                      <div className="text-sm text-gray-700">
                        {leave.category === 'multi-day' ? (
                          <>
                            <span className="font-medium">From:</span> {leave.from_date} <span className="mx-2">|</span> <span className="font-medium">To:</span> {leave.to_date}
                          </>
                        ) : (
                          <>
                            <span className="font-medium">Date:</span> {leave.leave_date}
                          </>
                        )}
                        <span className="mx-2">|</span><span className="font-medium">Leave Type:</span> {leave.leave_type}
                      </div>
                      <div className="text-xs text-gray-500">Reason: {leave.reason}</div>
                      {leave.category === 'multi-day' && (
                        <div className="text-xs text-gray-500">Description: {leave.brief_description}</div>
                      )}
                      <div className="text-xs flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                          ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                          ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                        `}>{leave.status}</span>
                      </div>
                    </div>
                  </Card>
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
                onUpdate={updateTask}
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
    const today = new Date();
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        </div>

        {leavesError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {leavesError}
          </div>
        )}

        {leavesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <LeaveCalendar
            leaves={leaves}
            onAddLeave={addLeave}
            onUpdateLeave={handleUpdateLeave}
            onDeleteLeave={handleDeleteLeave}
          />
        )}
        {/* Edit and Delete modals will be implemented next */}
        {/* Edit Leave Modal */}
        {editFormOpen && editLeave && (
          <Modal isOpen={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Leave">
            <LeaveForm
              isOpen={editFormOpen}
              onClose={() => setEditFormOpen(false)}
              onSubmit={handleUpdateLeave}
              selectedDate={editLeave.leave_date}
              initialData={editLeave}
              noModal={true}
            />
          </Modal>
        )}
        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Leave">
            <div>Are you sure you want to delete this leave?</div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteLeave}>Delete</Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'projects') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
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
              if (projectTasks.length === 0) return null;
              return (
                <ProjectCard key={project.id} project={project} tasks={projectTasks} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MemberDashboard;