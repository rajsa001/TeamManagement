import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyTask, DailyTaskFilters, Member, Admin } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';
import { toast } from 'react-toastify';

export const useDailyTasks = (filters: DailyTaskFilters = {}) => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('daily_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.member) {
        query = query.eq('user_id', filters.member);
      }
      if (filters.date) {
        query = query.eq('task_date', filters.date);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.search) {
        query = query.or(`task_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // If not admin, only show user's own tasks
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching daily tasks:', error);
        setError(error.message || 'Failed to fetch daily tasks');
        setTasks([]);
      } else {
        // Fetch user information for all tasks
        const tasksWithUsers = await fetchUserDataForTasks(data || []);
        setTasks(tasksWithUsers);
      }
    } catch (err) {
      console.error('Error in fetchTasks:', err);
      setError('Failed to fetch daily tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.member, filters.date, filters.priority, filters.search, user?.id, user?.role]);

  // Function to fetch user data for tasks
  const fetchUserDataForTasks = async (tasks: any[]): Promise<DailyTask[]> => {
    if (!tasks.length) return [];
    
    try {
      // Get unique user IDs from tasks
      const userIds = [...new Set(tasks.map(task => task.user_id))];
      
      // Fetch both members and admins
      const [membersData, adminsData] = await Promise.all([
        supabase
          .from('members')
          .select('id, name, email, avatar_url')
          .in('id', userIds)
          .eq('is_active', true),
        supabase
          .from('admins')
          .select('id, name, email, avatar_url')
          .in('id', userIds)
          .eq('is_active', true)
      ]);

      // Combine members and admins into a single map
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

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    subscriptionRef.current = supabase
      .channel('daily_tasks_changes')
      .on('presence', { event: 'sync' }, () => {
        console.log('🟢 Real-time connection established');
        setRealtimeConnected(true);
      })
      .on('presence', { event: 'join' }, () => {
        console.log('🟢 Real-time client joined');
      })
      .on('presence', { event: 'leave' }, () => {
        console.log('🔴 Real-time client left');
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tasks'
        },
        (payload) => {
          console.log('🔄 Real-time change received:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old
          });

          // Show toast for real-time updates (only for updates, not for user's own actions)
          if (payload.eventType === 'UPDATE' && payload.new?.updated_by !== user?.id) {
            const taskName = payload.new?.task_name || 'Task';
            toast.info(`🔄 ${taskName} was updated in real-time`, {
              position: "top-right",
              autoClose: 3000,
            });
          } else if (payload.eventType === 'INSERT' && payload.new?.created_by !== user?.id) {
            const taskName = payload.new?.task_name || 'Task';
            toast.info(`🆕 New task "${taskName}" was created`, {
              position: "top-right",
              autoClose: 3000,
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.created_by !== user?.id) {
            const taskName = payload.old?.task_name || 'Task';
            toast.info(`🗑️ Task "${taskName}" was deleted`, {
              position: "top-right",
              autoClose: 3000,
            });
          }
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            // Fetch complete task data with user relationship
            const fetchCompleteTask = async () => {
              const { data: completeTask, error } = await supabase
                .from('daily_tasks')
                .select('*')
                .eq('id', payload.new.id)
                .single();
              
              if (error || !completeTask) {
                console.error('Error fetching complete task data:', error);
                return;
              }
              
              // Fetch user data for the new task
              const tasksWithUsers = await fetchUserDataForTasks([completeTask]);
              const newTask = tasksWithUsers[0] as DailyTask;
            setTasks(prevTasks => {
              // Check if task already exists to avoid duplicates
              if (prevTasks.find(task => task.id === newTask.id)) {
                return prevTasks;
              }
              
              // Apply filters to new task
              let shouldInclude = true;
              if (filters.status && newTask.status !== filters.status) shouldInclude = false;
              if (filters.member && newTask.user_id !== filters.member) shouldInclude = false;
              if (filters.date && newTask.task_date !== filters.date) shouldInclude = false;
              if (filters.priority && newTask.priority !== filters.priority) shouldInclude = false;
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = 
                  newTask.task_name.toLowerCase().includes(searchLower) ||
                  (newTask.description && newTask.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) shouldInclude = false;
              }
              
              // If not admin, only include user's own tasks
              if (user.role !== 'admin' && newTask.user_id !== user.id) shouldInclude = false;
              
                             if (shouldInclude) {
                 return [newTask, ...prevTasks];
               }
               return prevTasks;
             });
            };
            
            fetchCompleteTask();
          } else if (payload.eventType === 'UPDATE') {
            // Fetch complete task data with user relationship
            const fetchCompleteTask = async () => {
              const { data: completeTask, error } = await supabase
                .from('daily_tasks')
                .select('*')
                .eq('id', payload.new.id)
                .single();
              
              if (error || !completeTask) {
                console.error('Error fetching complete task data:', error);
                return;
              }
              
              // Fetch user data for the updated task
              const tasksWithUsers = await fetchUserDataForTasks([completeTask]);
              const updatedTask = tasksWithUsers[0] as DailyTask;
            setTasks(prevTasks => {
              const taskIndex = prevTasks.findIndex(task => task.id === updatedTask.id);
              if (taskIndex === -1) return prevTasks;
              
              // Check if updated task still matches filters
              let shouldInclude = true;
              if (filters.status && updatedTask.status !== filters.status) shouldInclude = false;
              if (filters.member && updatedTask.user_id !== filters.member) shouldInclude = false;
              if (filters.date && updatedTask.task_date !== filters.date) shouldInclude = false;
              if (filters.priority && updatedTask.priority !== filters.priority) shouldInclude = false;
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch = 
                  updatedTask.task_name.toLowerCase().includes(searchLower) ||
                  (updatedTask.description && updatedTask.description.toLowerCase().includes(searchLower));
                if (!matchesSearch) shouldInclude = false;
              }
              
              // If not admin, only include user's own tasks
              if (user.role !== 'admin' && updatedTask.user_id !== user.id) shouldInclude = false;
              
              if (shouldInclude) {
                const newTasks = [...prevTasks];
                newTasks[taskIndex] = updatedTask;
                return newTasks;
                             } else {
                 // Remove task if it no longer matches filters
                 return prevTasks.filter(task => task.id !== updatedTask.id);
               }
             });
            };
            
            fetchCompleteTask();
          } else if (payload.eventType === 'DELETE') {
            const deletedTaskId = payload.old.id;
            setTasks(prevTasks => prevTasks.filter(task => task.id !== deletedTaskId));
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user?.id, user?.role, filters.status, filters.member, filters.date, filters.priority, filters.search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (taskData: Omit<DailyTask, 'id' | 'created_at' | 'updated_at' | 'user' | 'created_by_user'>) => {
    if (!user) {
      setError('No user found. Cannot create task.');
      return null;
    }

    setError(null);

    try {
      // Ensure required fields are present
      const taskToInsert = {
        ...taskData,
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        is_active: taskData.is_active !== undefined ? taskData.is_active : true,
        task_date: taskData.task_date || new Date().toISOString().split('T')[0],
        // For admins, created_by should be the admin's ID (which is not in members table)
        // For members, created_by should be their member ID
        created_by: taskData.created_by || user.id
      };

      const { data, error } = await supabase
        .from('daily_tasks')
        .insert([taskToInsert])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating daily task:', error);
        setError(error.message || 'Error creating daily task');
        return null;
      }

      if (data) {
        // Fetch user data for the new task
        const tasksWithUsers = await fetchUserDataForTasks([data]);
        const taskWithUser = tasksWithUsers[0];
        
        toast.success(`📝 Daily Task Added: ${data.task_name}`, {
          position: "top-right",
          autoClose: 4500,
        });
        return taskWithUser;
      }
    } catch (err) {
      console.error('Error in createTask:', err);
      setError('Failed to create daily task');
    }
    return null;
  }, [user?.id, fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<DailyTask>) => {
    if (!id || !user) {
      setError('Invalid task id or no user found.');
      return null;
    }

    setError(null);

    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating daily task:', error);
        setError(error.message || 'Error updating daily task');
        return null;
      }

      if (data) {
        // Fetch user data for the updated task
        const tasksWithUsers = await fetchUserDataForTasks([data]);
        const taskWithUser = tasksWithUsers[0];
        
        toast.success(`✅ Daily Task Updated: ${data.task_name}`, {
          position: "top-right",
          autoClose: 3000,
        });
        return taskWithUser;
      }
    } catch (err) {
      console.error('Error in updateTask:', err);
      setError('Failed to update daily task');
    }
    return null;
  }, [user?.id, fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!id || !user) {
      setError('Invalid task id or no user found.');
      return;
    }

    setError(null);
    const taskToDelete = tasks.find(t => t.id === id);
    
    if (!taskToDelete) {
      setError('Task not found');
      return;
    }

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting daily task:', error);
        setError(error.message || 'Error deleting daily task');
        return;
      }

      toast.success(`🗑️ Daily Task Deleted: ${taskToDelete.task_name}`, {
        position: "top-right",
        autoClose: 4000,
      });
    } catch (err) {
      console.error('Error in deleteTask:', err);
      setError('Failed to delete daily task');
    }
  }, [user?.id, tasks, fetchTasks]);

  const markCompleted = useCallback(async (id: string) => {
    return updateTask(id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }, [updateTask]);

  const markSkipped = useCallback(async (id: string) => {
    return updateTask(id, {
      status: 'skipped',
      completed_at: null
    });
  }, [updateTask]);

  const markPending = useCallback(async (id: string) => {
    return updateTask(id, {
      status: 'pending',
      completed_at: null
    });
  }, [updateTask]);

  return {
    tasks,
    loading,
    error,
    realtimeConnected,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    markCompleted,
    markSkipped,
    markPending
  };
};
