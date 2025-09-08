import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Task, TaskFilters } from '../types';
import { deletedTasksService } from '../services/deletedTasks';
import { useAuth } from '../contexts/AuthContext';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserDataForTasks = async (tasks: any[]): Promise<Task[]> => {
    if (!tasks.length) return [];
    
    try {
      // Get unique user IDs from tasks
      const userIds = [...new Set(tasks.map(task => task.user_id))];
      
      // Fetch members, admins, and project managers
      const [membersData, adminsData, projectManagersData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email, avatar_url')
          .in('id', userIds)
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name, email, avatar_url')
          .in('id', userIds)
          .eq('is_active', true),
        supabase
          .from('project_managers')
          .select('id, name, email, avatar_url')
          .in('id', userIds)
          .eq('is_active', true)
      ]);

      // Combine members, admins, and project managers into a single map
      const userMap = new Map();
      
      if (membersData.data) {
        membersData.data.forEach(member => {
          userMap.set(member.id, { ...member, role: 'member' });
        });
      }
      
      if (adminsData.data) {
        adminsData.data.forEach(admin => {
          userMap.set(admin.id, { ...admin, role: 'admin' });
        });
      }
      
      if (projectManagersData.data) {
        projectManagersData.data.forEach(pm => {
          userMap.set(pm.id, { ...pm, role: 'project_manager' });
        });
      }

      // Attach user data to tasks
      return tasks.map(task => ({
        ...task,
        user: userMap.get(task.user_id) || null
      }));
    } catch (error) {
      console.error('Error fetching user data for tasks:', error);
      // Return tasks without user data if there's an error
      return tasks.map(task => ({
        ...task,
        user: null
      }));
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user data for all tasks
      const tasksWithUsers = await fetchUserDataForTasks(data || []);
      setTasks(tasksWithUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

      if (error) throw error;
      
      // Fetch user data for the new task
      const tasksWithUsers = await fetchUserDataForTasks([data]);
      const taskWithUser = tasksWithUsers[0];
      
      setTasks(prev => [taskWithUser, ...prev]);
      return taskWithUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      console.log('useTasks: updateTask called with:', { id, updates });
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      console.log('useTasks: Task updated successfully:', data);
      
      // Fetch user data for the updated task
      const tasksWithUsers = await fetchUserDataForTasks([data]);
      const taskWithUser = tasksWithUsers[0];
      
      setTasks(prev => prev.map(task => task.id === id ? taskWithUser : task));
      return taskWithUser;
    } catch (err) {
      console.error('useTasks: Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) {
      setError('No user found. Cannot delete task.');
      throw new Error('No user found');
    }

    try {
      // First, get the task data before deleting
      const taskToDelete = tasks.find(task => task.id === id);
      if (!taskToDelete) {
        setError('Task not found');
        throw new Error('Task not found');
      }

      // Record the deletion in deleted_tasks table
      await deletedTasksService.recordDeletedTask(taskToDelete, user.id, 'regular');

      // Then delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const filterTasks = (filters: TaskFilters, taskList?: Task[]) => {
    const tasksToFilter = taskList || tasks;
    let filteredTasks = tasksToFilter.filter(task => {
      // Status filter
      if (filters.status && task.status !== filters.status) return false;
      
      // Priority filter
      if (filters.priority && task.priority !== filters.priority) return false;
      
      // Assigned To filter (check both assignee and assignedTo for compatibility)
      if (filters.assignedTo && task.user_id !== filters.assignedTo) return false;
      if (filters.assignee && task.user_id !== filters.assignee) return false;
      
      // Project filter
      if (filters.project && task.project_id !== filters.project) return false;
      
      // User ID filter (for "My Tasks")
      if (filters.userId && task.user_id !== filters.userId) return false;
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const taskName = task.task_name.toLowerCase();
        const description = task.description?.toLowerCase() || '';
        
        if (!taskName.includes(searchTerm) && !description.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });

    // Sort tasks: pending/in-progress on top, completed below
    filteredTasks.sort((a, b) => {
      // Define priority order: pending/in-progress first, then completed
      const getStatusPriority = (status: string) => {
        if (status === 'pending' || status === 'in_progress' || status === 'not_started') {
          return 1; // Higher priority (appears first)
        } else if (status === 'completed') {
          return 2; // Lower priority (appears last)
        }
        return 3; // Other statuses (blocked, cancelled, etc.)
      };

      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);

      // If status priorities are different, sort by status priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If status priorities are the same, sort by due date (earliest first)
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });

    // Apply due date sort if specified (this will override the default sorting)
    if (filters.dueDateSort) {
      filteredTasks.sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        
        if (filters.dueDateSort === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    }

    return filteredTasks;
  };

  const refetchTasks = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    filterTasks,
    refetchTasks
  };
};
