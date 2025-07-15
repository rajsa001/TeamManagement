import { useState, useEffect } from 'react';
import { Task, TaskFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadTasks = async () => {
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
        setTasks(data || []);
      }
      setLoading(false);
    };
    if (user) loadTasks();
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
      setTasks(prev => [data, ...prev]);
      // Send webhook to n8n automation
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
      return true;
    }
    setError('Unknown error adding task');
    return false;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('Error updating task:', error);
    }
    if (data) {
      setTasks(prev => prev.map(task => (task.id === id ? data : task)));
      // Send webhook to n8n automation for task update
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
            event: 'task-updated',
          }),
        });
      } catch (webhookError) {
        console.error('Failed to send task updated webhook:', webhookError);
      }
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error);
    }
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const filterTasks = (filters: TaskFilters) => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.member && task.user_id !== filters.member) return false;
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
  };
};