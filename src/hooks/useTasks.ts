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
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*, project:projects(*), user:members!user_id(*)');
    if (user?.role !== 'admin') {
      query = query.eq('user_id', user?.id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } else {
      setTasks(data || []);
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
      toast('📝 New Task Added', {
        description: `A new task has been assigned to you: ${data.task_name}`,
        style: { background: '#2563eb', color: 'white' },
        duration: 4500,
      });
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
        if (user?.role === 'admin' && data.user_id) {
          await supabase.from('notifications').insert([
            {
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
          // Optionally, notify the admin (self)
          await supabase.from('notifications').insert([
            {
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
        } else if (user?.role !== 'admin') {
          // Member adds a task: notify all admins and self
          const { data: admins } = await supabase
            .from('admins')
            .select('id, name')
            .neq('email', '');
          if (admins && admins.length > 0) {
            await Promise.all(admins.map((admin: any) =>
              supabase.from('notifications').insert([
                {
                  from_id: user.id,
                  to_id: admin.id,
                  title: '📝 Task Added',
                  message: `${user.name || 'A member'} added a new task: ${data.task_name}`,
                  type: 'task_added',
                  related_id: data.id,
                  related_type: 'task',
                  created_at: new Date().toISOString(),
                },
              ])
            ));
          }
          // Notify the member (self)
          await supabase.from('notifications').insert([
            {
              from_id: user.id,
              to_id: user.id,
              title: '📝 You added a new task',
              message: `You added a new task: ${data.task_name}`,
              type: 'task_added',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
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
    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'];
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
      let bgColor = '';
      if (updates.status === 'completed') {
        emoji = '🎉';
        statusText = 'completed';
        bgColor = '#22c55e'; // green
      } else if (updates.status === 'in_progress') {
        emoji = '⏳';
        statusText = 'in progress';
        bgColor = '#eab308'; // yellow
      } else if (updates.status === 'pending' || updates.status === 'not_started') {
        emoji = '⏳';
        statusText = updates.status === 'pending' ? 'pending' : 'not started';
        bgColor = '#ef4444'; // red
      } else if (updates.status === 'blocked') {
        emoji = '🛑';
        statusText = 'blocked';
        bgColor = '#6b7280'; // gray
      } else if (updates.status === 'cancelled') {
        emoji = '🚫';
        statusText = 'cancelled';
        bgColor = '#6b7280'; // gray
      }
      toast(`${emoji} Task Status Updated`, {
        description: `Status for task "${data.task_name}" changed to ${statusText}.`,
        style: { background: bgColor, color: 'white' },
        duration: 4500,
      });
    }
    // Show toast for progress update
    if (updates.progress !== undefined) {
      toast('📈 Task Progress Updated', {
        description: `Progress for task "${data.task_name}" is now ${data.progress}%`,
        style: { background: '#eab308', color: 'black' },
        duration: 3000,
      });
    }
    // Send webhook to n8n automation for task update (legacy)
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
          member_email: user ? user.email : '',
          event: 'task-updated',
        }),
      });
    } catch (webhookError) {
      console.error('Failed to send task updated webhook:', webhookError);
    }
    // --- NEW: Send to admin automation pipeline if status changed ---
    let webhookError = null;
    if (updates.status && prevStatus && updates.status !== prevStatus) {
      // Fetch member name and email
      let memberName = '';
      let memberEmail = '';
      let projectName = '';
      if (data.user_id) {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('name, email')
          .eq('id', data.user_id)
          .single();
        if (!memberError && member) {
          memberName = member.name;
          memberEmail = member.email;
        }
      }
      if (data.project_id) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.project_id)
          .single();
        if (!projectError && project) projectName = project.name;
      }
      try {
        await fetch('https://n8nautomation.site/webhook-test/onTaskUpdatedByAdmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_name: data.task_name,
            description: data.description,
            due_date: data.due_date,
            assigned_date: data.created_at,
            assigned_to: memberName,
            assigned_to_email: memberEmail,
            project_name: projectName,
            updated_by: user.name || '',
            updated_status: updates.status,
            previous_status: prevStatus,
            status_updated_date: new Date().toISOString(),
          }),
        });
      } catch (err) {
        webhookError = err;
        console.error('Failed to send admin automation update webhook:', err);
      }
      // --- Always attempt to send notification to member on status update ---
      try {
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
        // Prevent duplicate notification for member
        const { data: existing, error: existingError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', data.user_id)
          .eq('type', 'task_status_updated')
          .eq('related_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!existingError && existing && existing.length > 0) {
          // Notification already exists, skip insert
        } else {
          await supabase.from('notifications').insert([
            {
              user_id: data.user_id,
              title: `${emoji} Task Status Updated`,
              message: `Status for task "${data.task_name}" changed to ${statusText}.`,
              type: 'task_status_updated',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        // --- NEW: Also notify all admins ---
        let memberName = '';
        if (data.user_id) {
          const { data: member, error: memberError } = await supabase
            .from('members')
            .select('name')
            .eq('id', data.user_id)
            .single();
          if (!memberError && member) {
            memberName = member.name;
          }
        }
        if (user && user.id) {
          const { data: admins } = await supabase
            .from('admins')
            .select('id, name')
            .neq('email', '')
            .neq('id', user.id);
          if (admins && admins.length > 0) {
            await Promise.all(admins.map((admin: any) =>
              supabase.from('notifications').insert([
                {
                  user_id: admin.id,
                  title: `${emoji} Task Status Updated for Member`,
                  message: `Task "${data.task_name}" for member ${memberName} changed to ${statusText}.`,
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
        console.error('Failed to send notification to member/admin:', notifError);
      }
      // --- END NEW ---
    }
    // --- NEW: Notify all admins and the member (from/to logic) ---
    try {
      if (user?.role !== 'admin') {
        // Member updates a task: notify all admins and self
        const { data: admins } = await supabase
          .from('admins')
          .select('id, name')
          .neq('email', '');
        if (admins && admins.length > 0) {
          await Promise.all(admins.map((admin: any) =>
            supabase.from('notifications').insert([
              {
                user_id: admin.id,
                from_id: user?.id,
                to_id: admin.id,
                title: '📝 Task Updated',
                message: `${user?.name || 'A member'} updated a task: ${data.task_name}`,
                type: 'task_updated',
                related_id: data.id,
                related_type: 'task',
                created_at: new Date().toISOString(),
              },
            ])
          ));
        }
        // Notify the member (self)
        if (user?.id) {
          await supabase.from('notifications').insert([
            {
              user_id: user.id,
              from_id: user.id,
              to_id: user.id,
              title: '📝 You updated a task',
              message: `You updated a task: ${data.task_name}`,
              type: 'task_updated',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } else {
        // Admin updates a task: notify the member and self
        if (data.user_id) {
          // Notify the member
          await supabase.from('notifications').insert([
            {
              user_id: data.user_id,
              from_id: user.id,
              to_id: data.user_id,
              title: '📝 Task Updated by Admin',
              message: `Admin ${user.name} updated your task: ${data.task_name}`,
              type: 'task_updated_by_admin',
              related_id: data.id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        // Notify the admin (self)
        await supabase.from('notifications').insert([
          {
            user_id: user.id,
            from_id: user.id,
            to_id: user.id,
            title: '📝 You updated a member task',
            message: `You updated a member's task: ${data.task_name}`,
            type: 'task_updated_by_admin',
            related_id: data.id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (notifError) {
      console.error('Failed to send notification to admin/member (task updated):', notifError);
    }
    // --- END NEW ---
    return data;
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      console.error('No user found. Cannot send task deletion notification.');
      return;
    }
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
    }
    setTasks(prev => prev.filter(task => task.id !== id));
    // Show toast for task deletion
    toast('🗑️ Task Deleted', {
      description: 'A task was deleted from your list.',
      style: { background: '#6b7280', color: 'white' }, // gray
      duration: 4500,
    });
    // --- Add notification for task deletion for all admins and member ---
    try {
      if (user.role === 'admin') {
        // Admin deletes a task: notify the member and self
        let memberId = null;
        try {
          const { data: taskData } = await supabase.from('tasks').select('user_id').eq('id', id).single();
          memberId = taskData?.user_id;
        } catch {}
        if (memberId) {
          await supabase.from('notifications').insert([
            {
              from_id: user.id,
              to_id: memberId,
              title: '🗑️ Task Deleted by Admin',
              message: `Admin ${user.name} deleted your task.`,
              type: 'task_deleted_by_admin',
              related_id: id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        // Notify the admin (self)
        await supabase.from('notifications').insert([
          {
            from_id: user.id,
            to_id: user.id,
            title: '🗑️ You deleted a member task',
            message: `You deleted a member's task.`,
            type: 'task_deleted_by_admin',
            related_id: id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        // Member deletes a task: notify all admins and self
        const { data: admins } = await supabase
          .from('admins')
          .select('id, name')
          .neq('email', '');
        if (admins && admins.length > 0) {
          await Promise.all(admins.map((admin: any) =>
            supabase.from('notifications').insert([
              {
                from_id: user.id,
                to_id: admin.id,
                title: '🗑️ Task Deleted',
                message: `${user.name || 'A member'} deleted a task.`,
                type: 'task_deleted',
                related_id: id,
                related_type: 'task',
                created_at: new Date().toISOString(),
              },
            ])
          ));
        }
        // Notify the member (self)
        await supabase.from('notifications').insert([
          {
            from_id: user.id,
            to_id: user.id,
            title: '🗑️ You deleted a task',
            message: `You deleted a task.`,
            type: 'task_deleted',
            related_id: id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (notifError) {
      console.error('Failed to send notification for task deleted:', notifError);
    }
    // --- END NEW ---
  };

  const filterTasks = (filters: TaskFilters) => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.member && task.user_id !== filters.member) return false;
      if (filters.assignedTo && task.user_id !== filters.assignedTo) return false;
      if (filters.project && task.project_id !== filters.project) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !task.task_name.toLowerCase().includes(searchLower) &&
          !task.description.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (filters.dueDateSort === 'asc') {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (filters.dueDateSort === 'desc') {
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      }
      return 0;
    });
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    filterTasks,
    refetchTasks,
  };
};