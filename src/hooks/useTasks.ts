import { useState, useEffect } from 'react';
import { Task, TaskFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Refetch function
  const refetchTasks = async () => {
    console.log('[DEBUG] refetchTasks called');
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*, project:projects(*)');
    if (user?.role !== 'admin') {
      query = query.eq('user_id', user?.id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } else {
      // Fetch user details for each task (could be member or admin)
      const tasksWithUsers = await Promise.all((data || []).map(async (task) => {
        // Try to find user in members table first
        let { data: memberUser } = await supabase
          .from('members')
          .select('id, name, email')
          .eq('id', task.user_id)
          .single();
        
        // If not found in members, try admins table
        if (!memberUser) {
          let { data: adminUser } = await supabase
            .from('admins')
            .select('id, name, email')
            .eq('id', task.user_id)
            .single();
          memberUser = adminUser;
        }
        
        return {
          ...task,
          user: memberUser
        };
      }));
      
      setTasks(tasksWithUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) refetchTasks();
  }, [user]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'user'> & { created_by: string }) => {
    setError(null);
    // Log the payload for debugging
    console.log('Attempting to add task with payload:', taskData);
    if (!taskData.user_id || !taskData.created_by) {
      setError('Missing user_id or created_by');
      return false;
    }
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskData }])
      .select('*')
      .single();
    if (error) {
      setError(error.message || 'Error adding task');
      console.error('Error adding task:', error);
      return false;
    }
    if (data) {
      await refetchTasks();
      // Only show toast for member, not for admin self
      if (user?.role !== 'admin') {
      toast('📝 New Task Added', {
        description: `A new task has been assigned to you: ${data.task_name}`,
        style: { background: '#2563eb', color: 'white' },
        duration: 4500,
      });
      }
      // Send webhook to n8n automation (legacy)
      try {
        await fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.id,
            task_name: data.task_name,
            description: data.description,
            assigned_to: data.user_id,
            due_date: data.due_date,
            created_by: data.created_by,
            status: data.status,
            member_email: user?.email || '',
          }),
        });
      } catch (webhookError) {
        console.error('Failed to send task added webhook:', webhookError);
      }
      // --- Notify member if admin adds a task ---
      try {
        // If the current user is admin and assigns a task to a member, notify the member
        if (user?.role === 'admin' && data.user_id && user?.id && user?.name) {
          console.log('[NOTIF] Admin adding task, inserting notification for member:', {
            from_id: user.id,
            to_id: data.user_id,
            task_name: data.task_name,
            related_id: data.id
          });
          const { error: notifError1 } = await supabase.from('notifications').insert([
            {
              user_id: data.user_id,
              from_id: user.id,
              to_id: data.user_id,
              title: '📝 New Task Assigned',
              message: `Admin ${user.name} assigned you a new task: ${data.task_name}`,
              type: 'task_added_by_admin',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
          if (notifError1) {
            console.error('[NOTIF] Error inserting notification for member:', notifError1);
          } else {
            console.log('[NOTIF] Notification for member inserted successfully');
          }
          // Optionally, notify the admin (self)
          console.log('[NOTIF] Admin adding task, inserting notification for self:', {
            from_id: user.id,
            to_id: user.id,
            task_name: data.task_name,
            related_id: data.id
          });
          const { error: notifError2 } = await supabase.from('notifications').insert([
            {
              user_id: user.id,
              from_id: user.id,
              to_id: user.id,
              title: '📝 You assigned a new task',
              message: `You assigned a new task to member: ${data.task_name}`,
              type: 'task_added_by_admin',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
          if (notifError2) {
            console.error('[NOTIF] Error inserting notification for admin (self):', notifError2);
          } else {
            console.log('[NOTIF] Notification for admin (self) inserted successfully');
          }
        } else if (user?.role === 'member') {
          // Member adds a task: notify all admins
          console.log('[NOTIF] Member adding task, fetching admins to notify');
          const { data: admins } = await supabase
            .from('admins')
            .select('id, name')
            .eq('is_active', true);

          // Get project name for the notification
          let projectName = '';
          if (data.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', data.project_id)
              .single();
            if (project) {
              projectName = project.name;
            }
          }

          if (admins && admins.length > 0) {
            console.log('[NOTIF] Found admins to notify:', admins.length);
            await Promise.all(admins.map((admin: any) =>
              supabase.from('notifications').insert([
                {
                  user_id: admin.id,
                  from_id: user.id,
                  to_id: admin.id,
                  title: '📝 New Task Added by Member',
                  message: `${user.name || 'A member'} added a new task${projectName ? ` in project "${projectName}"` : ''}: ${data.task_name}`,
                  type: 'task_added',
                  related_id: data.id,
                  related_type: 'task',
                  created_at: new Date().toISOString(),
                },
              ])
            ));
            console.log('[NOTIF] Notifications sent to all admins');
          }
        }
      } catch (notifError) {
        console.error('Failed to send notification for task added:', notifError);
      }
      return true;
    }
    setError('Unknown error adding task');
    return false;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!id || typeof id !== 'string') {
      console.error('Invalid task id for updateTask:', id);
      alert('Invalid task id. Cannot update task.');
      return null;
    }
    if (!user) {
      alert('No user found. Cannot update task.');
      return null;
    }
    // Find the previous task for status comparison
    const prevTask = tasks.find(task => task.id === id);
    const prevStatus = prevTask?.status;
    // Only allow valid statuses
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      console.error('Invalid status for updateTask:', updates.status);
      alert('Invalid status. Cannot update task.');
      return null;
    }
    // Only allow valid progress
    if (updates.progress !== undefined && (updates.progress < 0 || updates.progress > 100)) {
      alert('Progress must be between 0 and 100.');
      return null;
    }
    console.log('Updating task with id:', id, 'updates:', updates);
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + (error.message || error.code));
      return null;
    }
    if (!data) {
      console.error('No task updated. Check if the id exists and user has permission.', { id, updates });
      alert('No task was updated. The task may not exist or you may not have permission.');
      return null;
    }
    setTasks(prev => prev.map(task => (task.id === id ? data : task)));
    // Show toast for status update
    if (updates.status && prevStatus && updates.status !== prevStatus) {
      let emoji = '';
      let statusText = '';
      if (updates.status === 'completed') {
        emoji = '🎉';
        statusText = 'completed';
      } else if (updates.status === 'in_progress') {
        emoji = '⏳';
        statusText = 'in progress';
      } else if (updates.status === 'pending') {
        emoji = '⏳';
        statusText = 'pending';
      }
      toast(`${emoji} Task Status Updated`, {
        description: `Status for task "${data.task_name}" changed to ${statusText}.`,
        style: { background: '#eab308', color: 'white' },
        duration: 4500,
      });
      // --- Notification logic (like addTask) ---
      let projectName = '';
      if (data.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.project_id)
          .single();
        if (project) projectName = project.name;
      }
      try {
        if (user.role === 'admin') {
          // Notify only the member
          if (data.user_id) {
        await supabase.from('notifications').insert([
          {
            user_id: data.user_id,
            from_id: user.id,
            to_id: data.user_id,
                title: `${emoji} Task Status Updated by Admin`,
                message: `Admin ${user.name} updated your task${projectName ? ` in project "${projectName}"` : ''}: "${data.task_name}" to ${statusText}`,
            type: 'task_status_updated',
            related_id: data.id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
          }
        } else if (user.role === 'member') {
          // Notify all admins
          const { data: admins } = await supabase
            .from('admins')
            .select('id, name')
            .eq('is_active', true);
          if (admins && admins.length > 0) {
            await Promise.all(admins.map((admin: any) =>
              supabase.from('notifications').insert([
                {
                  user_id: admin.id,
                  from_id: user.id,
                  to_id: admin.id,
                  title: `${emoji} Task Status Updated by Member`,
                  message: `${user.name || 'A member'} updated task${projectName ? ` in project "${projectName}"` : ''}: "${data.task_name}" to ${statusText}`,
                  type: 'task_status_updated',
                  related_id: data.id,
                  related_type: 'task',
                  created_at: new Date().toISOString(),
                },
              ])
            ));
          }
        }
      } catch (notifError) {
        console.error('Failed to send notification for status update:', notifError);
      }
      }
    // Show toast for progress update
    if (updates.progress !== undefined) {
      toast('📈 Task Progress Updated', {
        description: `Progress for task "${data.task_name}" is now ${data.progress}%`,
        style: { background: '#eab308', color: 'black' },
        duration: 3000,
      });
    }
    // --- Notify for other updates (not status/progress) ---
    try {
      if (!updates.status && user.role === 'member') {
        // Member updates other task details: notify admins
        const { data: admins } = await supabase
          .from('admins')
          .select('id, name')
          .eq('is_active', true);
        if (admins && admins.length > 0) {
          await Promise.all(admins.map((admin: any) =>
            supabase.from('notifications').insert([
              {
                user_id: admin.id,
                from_id: user.id,
                to_id: admin.id,
                title: '📝 Task Updated',
                message: `${user.name || 'A member'} updated task: ${data.task_name}`,
                type: 'task_updated',
                related_id: data.id,
                related_type: 'task',
                created_at: new Date().toISOString(),
              },
            ])
          ));
        }
      }
    } catch (notifError) {
      console.error('Failed to send notification for task update:', notifError);
    }
    return data;
  };

  // Optionally, add more task-related hooks here (deleteTask, filterTasks, etc.)

  const deleteTask = async (id: string) => {
    if (!id) return;
    if (!user) {
      setError('No user found. Cannot delete task.');
      return;
    }
    setError(null);
    // Find the task to delete for notification context
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) {
      setError('Task not found');
      return;
    }
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      setError(error.message || 'Error deleting task');
      toast('❌ Failed to Delete Task', {
        description: error.message || 'Error deleting task',
        style: { background: '#ef4444', color: 'white' },
        duration: 4000,
      });
      return;
    }
    setTasks(prev => prev.filter(t => t.id !== id));
    await refetchTasks(); // Ensure UI updates instantly after delete
    toast('🗑️ Task Deleted', {
      description: `Task "${taskToDelete.task_name}" has been deleted.`,
      style: { background: '#2563eb', color: 'white' },
      duration: 4000,
    });
    // --- Notification logic (like addTask) ---
    let projectName = '';
    if (taskToDelete.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', taskToDelete.project_id)
        .single();
      if (project) projectName = project.name;
    }
    try {
      if (user.role === 'admin') {
        // Notify only the member
        if (taskToDelete.user_id) {
          await supabase.from('notifications').insert([
            {
              user_id: taskToDelete.user_id,
              from_id: user.id,
              to_id: taskToDelete.user_id,
              title: '🗑️ Task Deleted by Admin',
              message: `Admin ${user.name} deleted your task${projectName ? ` in project "${projectName}"` : ''}: "${taskToDelete.task_name}"`,
              type: 'task_status_updated',
              related_id: id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } else if (user.role === 'member') {
        // Notify all admins
        const { data: admins } = await supabase
          .from('admins')
          .select('id, name')
          .eq('is_active', true);
        if (admins && admins.length > 0) {
          await Promise.all(admins.map((admin: any) =>
            supabase.from('notifications').insert([
            {
                user_id: admin.id,
              from_id: user.id,
                to_id: admin.id,
                title: '🗑️ Task Deleted by Member',
                message: `${user.name || 'A member'} deleted task${projectName ? ` in project "${projectName}"` : ''}: "${taskToDelete.task_name}"`,
                type: 'task_status_updated',
                related_id: id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
            ])
          ));
        }
      }
    } catch (notifError) {
      console.error('Failed to send notification for task deleted:', notifError);
    }
    // Optionally: send webhook for legacy automation
    try {
      await fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskToDelete.id,
          task_name: taskToDelete.task_name,
          description: taskToDelete.description,
          assigned_to: taskToDelete.user_id,
          due_date: taskToDelete.due_date,
          created_at: taskToDelete.created_at,
          status: taskToDelete.status,
          member_email: user?.email || '',
          event: 'task-deleted',
        }),
      });
    } catch (webhookError) {
      console.error('Failed to send task deleted webhook:', webhookError);
    }
  };

  const filterTasks = (filters: TaskFilters, taskList?: Task[]) => {
    const tasksToFilter = taskList || tasks;
    return tasksToFilter.filter(task => {
      // Check both member and assignedTo filters for backward compatibility
      if (filters.member && task.user_id !== filters.member) return false;
      if (filters.assignedTo && task.user_id !== filters.assignedTo) return false;
      if (filters.project && task.project_id !== filters.project) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const taskName = task.task_name.toLowerCase();
        const description = task.description.toLowerCase();
        if (!taskName.includes(searchTerm) && !description.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    refetchTasks,
    setTasks,
    filterTasks,
    deleteTask,
  };
}