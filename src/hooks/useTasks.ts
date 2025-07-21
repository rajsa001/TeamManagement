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
        if (user?.role === 'admin' && data.user_id && user?.id && user?.name) {
          console.log('[NOTIF] Admin adding task, inserting notification for member:', {
            from_id: user.id,
            to_id: data.user_id,
            task_name: data.task_name,
            related_id: data.id
          });
          const { error: notifError1 } = await supabase.from('notifications').insert([
            {
              user_id: data.user_id, // <-- add user_id for member
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
              user_id: user.id, // <-- add user_id for admin (self)
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
        } else if (user?.role === 'member' && user?.id && user?.name) {
          // Member adds a task: notify all admins and self
          const { data: admins } = await supabase
            .from('admins')
            .select('id, name')
            .neq('email', '');
          if (admins && admins.length > 0) {
            await Promise.all(admins.map((admin: any) =>
              supabase.from('notifications').insert([
                {
                  user_id: admin.id, // <-- add user_id for admin
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
              user_id: user.id, // <-- add user_id for member (self)
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
        // Always insert notification for member on status update
        await supabase.from('notifications').insert([
          {
            user_id: data.user_id,
            from_id: user.id,
            to_id: data.user_id,
            title: `${emoji} Task Status Updated`,
            message: `Status for task "${data.task_name}" changed to ${statusText}.`,
            type: 'task_status_updated',
            related_id: data.id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
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
                  from_id: user.id,
                  to_id: admin.id,
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
              message: `You updated a member's task: ${data.task_name}`,
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
            type: 'task_updated',
            related_id: data.id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (notifError) {
      console.error('Failed to send notification to admins/member:', notifError);
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
    // Send notification to the other party
    try {
      // Fetch valid member and admin user_ids (auth.users.id)
      const { data: members } = await supabase.from('members').select('id, user_id');
      const { data: admins } = await supabase.from('admins').select('id, user_id');
      const memberIdToUserId = Object.fromEntries((members || []).map(m => [m.id, m.user_id]));
      const adminIdToUserId = Object.fromEntries((admins || []).map(a => [a.id, a.user_id]));
      const validMemberUserIds = (members || []).map(m => m.user_id).filter(Boolean);
      const validAdminUserIds = (admins || []).map(a => a.user_id).filter(Boolean);

      function isValidId(id: any, list: string[]) {
        return typeof id === 'string' && id.length === 36 && list.includes(id);
      }

      if (user?.role === 'admin') {
        // Notify member
        const memberUserId = memberIdToUserId[taskToDelete.user_id];
        // Always insert notification, even if memberUserId is null
        console.log('[NOTIF] Inserting notification for member (user_id may be null):', memberUserId);
        const { error: notifError1 } = await supabase.from('notifications').insert([
          {
            user_id: taskToDelete.user_id, // Set to member's id so real-time works
            from_id: adminIdToUserId[user.id] || null,
            to_id: memberUserId || null,
            title: '🗑️ Task Deleted by Admin',
            message: `Admin ${user.name} deleted your task: ${taskToDelete.task_name}`,
            type: 'task_status_updated',
            related_id: id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
        if (notifError1) {
          toast('❌ Notification Error', {
            description: notifError1.message || 'Failed to notify member of task deletion.',
            style: { background: '#ef4444', color: 'white' },
            duration: 4000,
          });
        }
        // Notify admin (self)
        const adminUserId = adminIdToUserId[user.id];
        console.log('[NOTIF] Inserting notification for admin (user_id may be null):', adminUserId);
        const { error: notifError2 } = await supabase.from('notifications').insert([
          {
            user_id: adminUserId || null,
            from_id: adminUserId || null,
            to_id: adminUserId || null,
            title: '🗑️ You deleted a member task',
            message: `You deleted a member's task: ${taskToDelete.task_name}`,
            type: 'task_status_updated',
            related_id: id,
            related_type: 'task',
            created_at: new Date().toISOString(),
          },
        ]);
        if (notifError2) {
          toast('❌ Notification Error', {
            description: notifError2.message || 'Failed to notify admin of task deletion.',
            style: { background: '#ef4444', color: 'white' },
            duration: 4000,
          });
        }
      } else if (user?.role === 'member') {
        // Notify all admins
        const memberUserId = memberIdToUserId[user.id];
        for (const admin of admins || []) {
          const adminUserId = admin.user_id;
          if (isValidId(adminUserId, validAdminUserIds)) {
            console.log('[NOTIF] Attempting to insert for admin:', adminUserId, 'from member:', memberUserId);
            await supabase.from('notifications').insert([
              {
                user_id: adminUserId,
                from_id: memberUserId,
                to_id: adminUserId,
                title: '🗑️ Task Deleted',
                message: `${user.name || 'A member'} deleted a task: ${taskToDelete.task_name}`,
                type: 'task_status_updated',
                related_id: id,
                related_type: 'task',
                created_at: new Date().toISOString(),
              },
            ]);
          } else {
            console.error('[NOTIF] Invalid admin user_id for notification:', adminUserId, 'Valid admins:', validAdminUserIds);
          }
        }
        // Notify member (self)
        if (isValidId(memberUserId, validMemberUserIds)) {
          console.log('[NOTIF] Attempting to insert for member self:', memberUserId, 'Valid members:', validMemberUserIds);
          await supabase.from('notifications').insert([
            {
              user_id: memberUserId,
              from_id: memberUserId,
              to_id: memberUserId,
              title: '🗑️ You deleted a task',
              message: `You deleted a task: ${taskToDelete.task_name}`,
              type: 'task_status_updated',
              related_id: id,
              related_type: 'task',
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          console.error('[NOTIF] Invalid member user_id for notification:', memberUserId, 'Valid members:', validMemberUserIds);
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

  const filterTasks = (filters: TaskFilters) => {
    return tasks.filter(task => {
      if (filters.member && task.user_id !== filters.member) return false;
      if (filters.project && task.project_id !== filters.project) return false;
      if (filters.status && task.status !== filters.status) return false;
      // Optionally, add search or dueDateSort logic here if needed
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
};