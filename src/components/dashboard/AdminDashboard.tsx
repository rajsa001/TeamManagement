import React, { useState } from 'react';
import { Plus, Users, BarChart3, UserPlus, ChevronDown, CheckCircle2, Calendar, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
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
import { authService } from '../../services/auth';
import { useEffect } from 'react';
import { format } from 'timeago.js';
import { toast } from 'sonner';

interface AdminDashboardProps {
  activeTab: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  // All hooks at the top
  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, deleteTask, filterTasks, refetchTasks } = useTasks();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave, updateLeave, setLeaves } = useLeaves();
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user } = useAuth();
  const isSuperAdmin = user?.email === 'rathorerajpal18112003@gmail.com';
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
  const [passwordError, setPasswordError] = useState('');
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editProjectForm, setEditProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    start_date: '',
    expected_end_date: ''
  });
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [openSections, setOpenSections] = useState({
    recentlyCompleted: false,
    dueToday: false,
    upcoming: false,
    blocked: false,
  });
  const [showWorking, setShowWorking] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveBalancesLoading, setLeaveBalancesLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [editingBalances, setEditingBalances] = useState<{ [memberId: string]: boolean }>({});
  const [balancesInput, setBalancesInput] = useState<any>({});
  const [leaveDefaults, setLeaveDefaults] = useState({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [defaultsInput, setDefaultsInput] = useState({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [editModalMemberId, setEditModalMemberId] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState<{ sick_leaves: number; casual_leaves: number; paid_leaves: number }>({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
  const [modalSaving, setModalSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [leavesSearch, setLeavesSearch] = useState('');
  const [leavesDate, setLeavesDate] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  useEffect(() => {
    if (activeTab === 'leaves') {
      const fetchBalances = async () => {
        const res = await supabase
          .from('member_leave_balances')
          .select('*');
        setLeaveBalances(res.data || []);
      };
      fetchBalances();
    }
    if (activeTab === 'leaves' && user?.role === 'admin') {
      const fetchDefaults = async () => {
        const res = await supabase.from('leave_defaults').select('*').single();
        if (res.data) {
          setLeaveDefaults(res.data);
          setDefaultsInput(res.data);
        }
      };
      fetchDefaults();
    }
  }, [leaves, activeTab, user]);

  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      const data = await authService.getMembers();
      if (isMounted) setMembers(data.map(m => ({ id: m.id, name: m.name })));
    };
    fetchMembers();
    const interval = setInterval(fetchMembers, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'leave-defaults' && isSuperAdmin) {
      setLeaveBalancesLoading(true);
      const fetchBalances = async () => {
        const res = await supabase.from('member_leave_balances').select('*');
        setLeaveBalances(res.data || []);
        setLeaveBalancesLoading(false);
        console.log('Fetched leave balances:', res.data);
      };
      fetchBalances();
    }
  }, [leaves, activeTab, isSuperAdmin]);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaves = async () => {
      const { data } = await supabase
        .from('leaves')
        .select('*, user:members!user_id(*)');
      if (isMounted && data) {
        // Use the same structure as useLeaves
        setLeaves(data);
      }
    };
    fetchLeaves();
    const interval = setInterval(fetchLeaves, 5000); // Poll every 5 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real-time subscription for tasks (admin sees all changes)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const channel = supabase.channel('tasks-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // On any change, refetch tasks
          refetchTasks();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- Admin notifications state and logic (mirroring member dashboard) ---
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(false);
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
  // Fetch notifications for the admin
  const fetchAdminNotifications = async () => {
    if (!user) return;
    setAdminNotificationsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const dismissed = getDismissedNotifications();
      const unique = Object.values(
        data.filter(n => !dismissed.includes(n.id)).reduce((acc, n) => {
          acc[n.id] = n;
          return acc;
        }, {} as Record<string, any>)
      );
      setAdminNotifications(unique);
    }
    setAdminNotificationsLoading(false);
  };
  // Real-time notifications for admin (mirroring member dashboard)
  useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 10000); // Poll every 10s
    if (!user || user.role !== 'admin') return () => clearInterval(interval);
    const channel = supabase.channel('notifications-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime notification payload:', payload);
          fetchAdminNotifications();
          // Show toast
          if (payload.new) {
            let dateTime = '';
            if (payload.new.created_at) {
              const d = new Date(payload.new.created_at);
              dateTime = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            toast(payload.new.title, {
              description: `${payload.new.message}${dateTime ? `\n${dateTime}` : ''}`,
              style: { background: '#2563eb', color: 'white' },
              duration: 4500,
            });
          }
        }
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch notifications when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchAdminNotifications();
    }
  }, [activeTab]);

  // Remove react-toastify ToastContainer usage

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'not_started' | 'in_progress' | 'completed') => {
    updateTask(id, { status });
  };

  // Add this handler for editing tasks
  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    const updated = await updateTask(id, updates);
    await refetchTasks();
    // --- Insert notification for member if status is updated by admin ---
    if (updates.status && user?.role === 'admin' && updated && updated.user_id) {
      // Prevent duplicate notification
      console.log('ADMIN: Inserting notification for member', updated.user_id, id, updates.status);
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', updated.user_id)
        .eq('type', 'task_status_updated')
        .eq('related_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!existingError && existing && existing.length > 0) {
        // Notification already exists, skip insert
      } else {
        let emoji = '';
        let statusText = '';
        if (updates.status === 'completed') {
          emoji = '🎉';
          statusText = 'completed';
        } else if (updates.status === 'in_progress') {
          emoji = '⏳';
          statusText = 'in progress';
        } else if (updates.status === 'blocked') {
          emoji = '🛑';
          statusText = 'blocked';
        } else if (updates.status === 'pending') {
          emoji = '⏳';
          statusText = 'pending';
        } else if (updates.status === 'cancelled') {
          emoji = '🚫';
          statusText = 'cancelled';
        }
        await supabase.from('notifications').insert([
          {
            user_id: updated.user_id,
            title: `${emoji} Task Status Updated`,
            message: `Status for task "${updated.task_name}" changed to ${statusText}.`,
            type: 'task_status_updated',
            related_id: id,
            related_type: 'task',
          },
        ]);
      }
    }
  };

  async function handleApproveDeclineLeave(leaveId: string, status: 'approved' | 'rejected', userId: string, leaveDate: string, endDate: string | null, leaveType: string, category?: string, from_date?: string | null, to_date?: string | null) {
    // Update leave status
    await updateLeave(leaveId, { status });
    // Send notification to member
    const isApproved = status === 'approved';
    const notifType = isApproved ? 'leave_approved' : 'leave_rejected';
    const notifTitle = isApproved ? 'Leave Approved' : 'Leave Rejected';
    let leaveDateStr = '';
    if (category === 'multi-day' && from_date && to_date) {
      leaveDateStr = `Type: Multi-day | From: ${from_date} | To: ${to_date} | Leave Type: ${leaveType}`;
    } else {
      leaveDateStr = `Type: Single Day | Date: ${leaveDate} | Leave Type: ${leaveType}`;
    }
    const notifMsg = isApproved
      ? `Your leave request (${leaveDateStr}) has been approved.`
      : `Your leave request (${leaveDateStr}) has been declined.`;
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

  // Add this function to toggle the open state for each section
  const toggleSection = (sectionKey: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Helper to render section
  const renderTaskSection = (title: string, Icon: any, tasks: any[], sectionKey: keyof typeof openSections, sectionName: string) => (
    <div>
      <div className="flex items-center gap-2 mb-4 group">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-extrabold text-gray-900 transition-transform duration-300 group-hover:scale-105">
          {title}
        </h2>
      </div>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-gray-500">No {title.toLowerCase()}.</div>
        ) : (
          <>
            <div className="h-80 flex">
              <TaskCard key={tasks[0].id} task={tasks[0]} showUser={true} onDelete={() => {}} onStatusChange={() => {}} section={sectionName} />
            </div>
            {tasks.length > 1 && !openSections[sectionKey] && (
              <button
                onClick={() => toggleSection(sectionKey)}
                className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                Load More
              </button>
            )}
            {tasks.length > 1 && openSections[sectionKey] && (
              <>
                <div className="space-y-4">
                  {tasks.slice(1).map(task => (
                    <div key={task.id} className="h-80 flex">
                      <TaskCard task={task} showUser={true} onDelete={() => {}} onStatusChange={() => {}} section={sectionName} />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Show Less
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Now, after all hooks, do conditional rendering:
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

    // Due Today: due date is today and not completed
    const dueTodayTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return isSameDay(due, today) && task.status !== 'completed';
    });

    // Upcoming: due date is within next 3 days (excluding today)
    const upcomingTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      const diff = (due.setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 3;
    });

    // Blocked: overdue and not completed, or status is 'blocked'
    const blockedTasks = tasks.filter(task => {
      const due = new Date(task.due_date);
      return (task.status !== 'completed' && due < today) || task.status === 'blocked';
    });

    // Calculate on leave and working today with names
    const todayStr = today.toISOString().split('T')[0];
    const onLeaveToday = members.filter(member =>
      leaves.some(leave => {
        if (leave.user_id !== member.id || leave.status !== 'approved') return false;
        if (leave.category === 'multi-day') {
          return leave.from_date <= todayStr && leave.to_date >= todayStr;
        } else {
          return leave.leave_date === todayStr;
        }
      })
    );
    const workingToday = members.filter(member => !onLeaveToday.some(l => l.id === member.id));

    // After the four task sections, add a summary for leaves
    // Calculate on leave and working today
    const onLeaveCount = onLeaveToday.length;
    // Assume members state contains all team members
    const totalMembers = members.length;
    const workingTodayCount = totalMembers - onLeaveCount;

    // Personalized greeting logic
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'good morning';
      if (hour < 18) return 'good afternoon';
      return 'good evening';
    };
    const adminName = user?.name || 'Admin';

    return (
      <div className="space-y-8 px-2 md:px-8 lg:px-16 pb-8">
        {/* Interactive animated greeting at the top */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>
              Hey <span className="text-blue-600 font-extrabold animate-pulse">{adminName}</span>, {getGreeting()} 
            </span>
            <span className="animate-waving-hand text-3xl ml-1" role="img" aria-label="wave">👋</span>
          </h1>
        </div>
        <DashboardStats tasks={tasks} leaves={leaves} />
        {/* Section title for leaves dashboard */}
        <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-2">Team Attendance Today</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          {/* Working today card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-bold text-green-700 flex items-center gap-2">
              <Users className="w-6 h-6 text-green-500" /> Working today - {workingTodayCount}
            </div>
            <button
              className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => setShowWorking(v => !v)}
            >
              {showWorking ? 'Hide' : 'Show'}
            </button>
            {showWorking && (
              <ul className="mt-3 w-full text-center text-gray-700 text-base">
                {workingTodayCount === 0 ? <li>No one working today</li> : workingToday.map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
              )}
            </div>
          {/* On Leave card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6 flex flex-col items-center">
            <div className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-red-500" /> On Leave - {onLeaveCount}
          </div>
            <button
              className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              onClick={() => setShowLeave(v => !v)}
            >
              {showLeave ? 'Hide' : 'Show'}
            </button>
            {showLeave && (
              <ul className="mt-3 w-full text-center text-gray-700 text-base">
                {onLeaveCount === 0 ? <li>No one on leave today</li> : onLeaveToday.map(m => <li key={m.id}>{m.name}</li>)}
              </ul>
              )}
            </div>
          </div>
        {/* Section title for task overview */}
        <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-2">Task Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderTaskSection('Recently Completed Tasks', CheckCircle2, recentlyCompletedTasks, 'recentlyCompleted', 'completed')}
          {renderTaskSection('Due Today', Calendar, dueTodayTasks, 'dueToday', 'today')}
          {renderTaskSection('Upcoming Tasks', Clock, upcomingTasks, 'upcoming', 'upcoming')}
          {renderTaskSection('Blocked Tasks', AlertCircle, blockedTasks, 'blocked', 'blocked')}
        </div>
        {/* Notifications summary at the top */}
        {adminNotifications.length > 0 && (
          <Card className="mb-6 p-4 border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-blue-800">Recent Notifications</h2>
              <Button size="sm" variant="primary" onClick={() => setActiveTab('notifications')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {adminNotifications.slice(0, 5).map(n => (
                <div key={n.id + '-' + n.created_at} className="border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-semibold text-blue-900">{n.title}</div>
                  <div className="text-sm text-blue-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
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
          members={members}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex h-80">
                <TaskCard
                  task={task}
                  onDelete={deleteTask}
                  onStatusChange={handleStatusChange}
                  showUser={true}
                  onUpdate={handleTaskUpdate}
                />
              </div>
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
    // Group leaves by member
    const leavesByMember: { [memberId: string]: any[] } = {};
    leaves.forEach(l => {
      if (!leavesByMember[l.user_id]) leavesByMember[l.user_id] = [];
      leavesByMember[l.user_id].push(l);
    });

    // Pending leaves
    const pendingLeaves = leaves.filter(l => l.status === 'pending');

    // Super-admin check
    const isSuperAdmin = user?.email === 'rathorerajpal18112003@gmail.com';

    // Handle balance edit
    const handleEditBalances = (memberId: string, balances: any) => {
      setEditingBalances((prev) => ({ ...prev, [memberId]: true }));
      setBalancesInput((prev: any) => ({ ...prev, [memberId]: { ...balances } }));
    };
    const handleSaveBalances = async (memberId: string) => {
      setSavingMemberId(memberId);
      const input = balancesInput[memberId];
      await supabase
        .from('member_leave_balances')
        .upsert({
          member_id: memberId,
          year: new Date().getFullYear(),
          sick_leaves: input.sick_leaves,
          casual_leaves: input.casual_leaves,
          paid_leaves: input.paid_leaves,
          updated_at: new Date().toISOString(),
        });
      setEditingBalances((prev) => ({ ...prev, [memberId]: false }));
      setLeaveBalancesLoading(true);
      const res = await supabase
        .from('member_leave_balances')
        .select('*');
      setLeaveBalances(res.data || []);
      setLeaveBalancesLoading(false);
      setSavingMemberId(null);
      console.log('Refetched leave balances:', res.data);
    };

    const handleSaveDefaults = async () => {
      await supabase.from('leave_defaults').upsert({
        id: 1,
        sick_leaves: defaultsInput.sick_leaves,
        casual_leaves: defaultsInput.casual_leaves,
        paid_leaves: defaultsInput.paid_leaves,
      });
      setLeaveDefaults(defaultsInput);
      setEditingDefaults(false);
    };

    // Add search for Member Leave Balances & History
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Team Leaves</h1>
        </div>
        {/* Pending Leaves Section (no search/filter) */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Pending Leaves</h2>
          {pendingLeaves.length === 0 ? (
            <div className="text-gray-500">No pending leave requests.</div>
        ) : (
          <div className="grid gap-4">
              {pendingLeaves.map(leave => (
                <Card key={leave.id} className="flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-200 bg-white">
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-gray-900 text-base">{leave.user?.name || 'Unknown User'}</div>
                    <div className="text-xs text-gray-400 mb-1">{leave.created_at ? format(leave.created_at) : ''}</div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Type:</span> {leave.category === 'multi-day' ? 'Multi-day' : 'Single Day'}
                      {leave.category === 'multi-day' ? (
                        <>
                          <span className="mx-2">|</span><span className="font-medium">From:</span> {leave.from_date} <span className="font-medium">To:</span> {leave.to_date}
                        </>
                      ) : (
                        <>
                          <span className="mx-2">|</span><span className="font-medium">Date:</span> {leave.leave_date}
                        </>
                      )}
                      <span className="mx-2">|</span><span className="font-medium">Leave Type:</span> {leave.leave_type}
                    </div>
                    <div className="text-xs text-gray-500">Reason: {leave.reason}</div>
                    <div className="text-xs flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                        ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${leave.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${leave.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>{leave.status}</span>
                    </div>
                  </div>
                    <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0 md:ml-6">
                      <Button variant="primary" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'approved', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type, leave.category, leave.from_date, leave.to_date)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={async () => await handleApproveDeclineLeave(leave.id, 'rejected', leave.user_id, leave.leave_date, leave.end_date ?? null, leave.leave_type, leave.category, leave.from_date, leave.to_date)}>Decline</Button>
                    </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        {/* Member Balances & History Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-8">Member Leave Balances & History</h2>
          <input
            type="text"
            placeholder="Search member by name..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-64 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <div className="space-y-4">
            {filteredMembers.map(member => {
              const balances = leaveBalances.find((b: any) => b.member_id === member.id && b.year === new Date().getFullYear());
              const memberLeaves = leavesByMember[member.id] || [];
              return (
                <Card key={member.id} className="border border-gray-200 bg-white">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}>
                    <div className="font-semibold text-gray-900 text-base py-2">{member.name}</div>
                    <Button size="sm" variant="outline">{expandedMember === member.id ? 'Hide' : 'Show'}</Button>
                  </div>
                  {expandedMember === member.id && (
                    <div className="p-4 border-t mt-2">
                      <div className="mb-2 font-medium text-gray-700">Leave Balances ({new Date().getFullYear()}):</div>
                      {balances ? (
                        <div className="flex gap-4 items-center mb-4">
                          {isSuperAdmin && editingBalances[member.id] ? (
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Sick</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.sick_leaves ?? balances?.sick_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], sick_leaves: +e.target.value } }))} />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Casual</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.casual_leaves ?? balances?.casual_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], casual_leaves: +e.target.value } }))} />
                              </label>
                              <label className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Paid</span>
                                <input type="number" className="border rounded px-2 py-1 w-20" value={balancesInput[member.id]?.paid_leaves ?? balances?.paid_leaves ?? 30} onChange={e => setBalancesInput((prev: any) => ({ ...prev, [member.id]: { ...prev[member.id], paid_leaves: +e.target.value } }))} />
                              </label>
                              <div className="flex gap-2 ml-2 mt-2 md:mt-0">
                                <Button size="sm" variant="primary" onClick={() => handleSaveBalances(member.id)} disabled={savingMemberId === member.id}>
                                  {savingMemberId === member.id ? 'Saving...' : 'Save'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingBalances((prev) => ({ ...prev, [member.id]: false }))} disabled={savingMemberId === member.id}>Cancel</Button>
                              </div>
                              <div className="text-xs text-gray-500 mt-2 w-full">These values override the default for this member for the year.</div>
                            </div>
                          ) : (
                            <>
                              <span className="px-2 py-1 bg-blue-50 rounded">Sick: {balances.sick_leaves}</span>
                              <span className="px-2 py-1 bg-yellow-50 rounded">Casual: {balances.casual_leaves}</span>
                              <span className="px-2 py-1 bg-green-50 rounded">Paid: {balances.paid_leaves}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">No balance record for this year.</div>
                      )}
                      <div className="mb-2 font-medium text-gray-700">Leave History:</div>
                      <div className="space-y-2">
                        {memberLeaves.length === 0 ? (
                          <div className="text-gray-500">No leaves found.</div>
                        ) : (
                          memberLeaves.map(lv => (
                            <div key={lv.id} className="border rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                              <div>
                                <span className="font-semibold">{lv.leave_type}</span> - {lv.category === 'multi-day' ? `${lv.from_date} to ${lv.to_date}` : lv.leave_date}
                                <span className="ml-2 text-xs">({lv.status})</span>
                              </div>
                              <div className="text-xs text-gray-500">Reason: {lv.reason}</div>
                            </div>
                          ))
                        )}
                      </div>
          </div>
        )}
                </Card>
              );
            })}
          </div>
        </div>
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError('');
              if (passwordForm.new !== passwordForm.confirm) {
                setPasswordError('New passwords do not match.');
                return;
              }
              setPasswordLoading(true);
              if (!user) {
                setPasswordError('User not found.');
                setPasswordLoading(false);
                return;
              }
              const ok = await authService.verifyAdminPassword(user.id, passwordForm.current);
              if (!ok) {
                setPasswordError('Current password is incorrect.');
                setPasswordLoading(false);
                return;
              }
              const password_hash = btoa(passwordForm.new);
              const { error } = await supabase
                .from('admins')
                .update({ password_hash })
                .eq('id', user.id);
              setPasswordLoading(false);
              if (!error) {
                setPasswordForm({ current: '', new: '', confirm: '' });
                setChangePasswordOpen(false);
                alert('Password updated successfully.');
              } else {
                setPasswordError('Failed to update password: ' + error.message);
              }
            }}
            className="space-y-4"
          >
            {passwordError && <div className="p-2 bg-red-100 text-red-700 rounded">{passwordError}</div>}
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
    if (!user || user.name !== 'Super-Admin' || user.email !== 'rathorerajpal18112003@gmail.com') {
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

  if (activeTab === 'leave-defaults' && isSuperAdmin) {
    if (leaveBalancesLoading || members.length === 0) {
      return <div className="text-center py-8 text-gray-500">Loading leave balances...</div>;
    }
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    // Date display
    const today = new Date();
    const year = today.getFullYear();
    const nextYear = year + 1;
    const calendarYear = `${year}-${nextYear}`;
    const todayDay = today.getDate();
    const todayMonth = today.toLocaleString(undefined, { month: 'short' });
    const todayYear = today.getFullYear();

    // Modal handlers scoped here
    const openEditModal = (memberId: string, balances: any) => {
      setEditModalMemberId(memberId);
      setModalInput({
        sick_leaves: balances?.sick_leaves ?? 30,
        casual_leaves: balances?.casual_leaves ?? 30,
        paid_leaves: balances?.paid_leaves ?? 30,
      });
    };
    const closeEditModal = () => {
      setEditModalMemberId(null);
      setModalInput({ sick_leaves: 30, casual_leaves: 30, paid_leaves: 30 });
      setModalSaving(false);
    };
    const handleModalSave = async () => {
      if (!editModalMemberId) return;
      setModalSaving(true);
      await supabase
        .from('member_leave_balances')
        .upsert([
          {
            member_id: editModalMemberId,
            year: year,
            sick_leaves: modalInput.sick_leaves,
            casual_leaves: modalInput.casual_leaves,
            paid_leaves: modalInput.paid_leaves,
            updated_at: new Date().toISOString(),
          }
        ], { onConflict: 'member_id,year' });
      setLeaveBalancesLoading(true);
      const res = await supabase
        .from('member_leave_balances')
        .select('*');
      setLeaveBalances(res.data || []);
      setLeaveBalancesLoading(false);
      setModalSaving(false);
      setEditModalMemberId(null);
    };

    return (
      <div className="space-y-8 max-w-2xl mx-auto mt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-blue-800 mb-1 animate-pulse">Leaves Management</h1>
            <div className="flex items-center gap-6 text-sm text-gray-700 mt-2">
              <span className="font-semibold animate-fade-in">Year: <span className="text-blue-600 font-bold animate-pulse-slow">{calendarYear}</span></span>
              <span className="font-semibold animate-fade-in">Today: <span className="text-green-600 font-bold animate-pulse-slow">{today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search member by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="text-gray-500 text-center">No members found.</div>
          ) : filteredMembers.map(member => {
            const balances = leaveBalances.find((b: any) => b.member_id === member.id && b.year === year);
            return (
              <Card key={member.id} className="border border-gray-200 bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="font-semibold text-gray-900 text-base mb-2 md:mb-0">{member.name}</div>
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="px-2 py-1 bg-blue-50 rounded">Sick: {balances?.sick_leaves ?? 30}</span>
                  <span className="px-2 py-1 bg-yellow-50 rounded">Casual: {balances?.casual_leaves ?? 30}</span>
                  <span className="px-2 py-1 bg-green-50 rounded">Paid: {balances?.paid_leaves ?? 30}</span>
                </div>
              </Card>
            );
          })}
        </div>
        {/* Modal for editing leave balances */}
        {editModalMemberId && (
          <Modal isOpen={!!editModalMemberId} onClose={closeEditModal} title="Edit Leave Balances">
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2">
                  <span className="w-20">Sick</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.sick_leaves} onChange={e => setModalInput(prev => ({ ...prev, sick_leaves: +e.target.value }))} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20">Casual</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.casual_leaves} onChange={e => setModalInput(prev => ({ ...prev, casual_leaves: +e.target.value }))} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-20">Paid</span>
                  <input type="number" className="border rounded px-2 py-1 w-24" value={modalInput.paid_leaves} onChange={e => setModalInput(prev => ({ ...prev, paid_leaves: +e.target.value }))} />
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button size="sm" variant="primary" onClick={handleModalSave} disabled={modalSaving}>{modalSaving ? 'Saving...' : 'Save'}</Button>
                <Button size="sm" variant="outline" onClick={closeEditModal} disabled={modalSaving}>Cancel</Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">These values override the default for this member for the year.</div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'notifications') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        {adminNotificationsLoading ? (
          <div className="text-gray-500">Loading notifications...</div>
        ) : adminNotifications.length === 0 ? (
          <div className="text-gray-500">No notifications.</div>
        ) : (
          <div className="space-y-4">
            {adminNotifications.map(n => (
              <Card key={n.id + '-' + n.created_at} className="flex items-center justify-between p-4 border border-gray-200 bg-white">
                <div>
                  <div className="font-semibold text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={() => {
                    addDismissedNotification(n.id);
                    setAdminNotifications(adminNotifications => adminNotifications.filter(x => x.id !== n.id));
                    supabase.from('notifications').delete().eq('id', n.id);
                  }}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AdminDashboard;