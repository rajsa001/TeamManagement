import { useState, useEffect } from 'react';
import { Task, TaskFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Mock data
  const mockTasks: Task[] = [
    {
      id: '1',
      user_id: '1',
      task_name: 'Complete project proposal',
      description: 'Draft the Q1 project proposal for client review',
      due_date: '2025-01-15',
      status: 'pending',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-10T10:00:00Z',
      user: { id: '1', name: 'John Doe', email: 'john@company.com', role: 'member', created_at: '', updated_at: '' }
    },
    {
      id: '2',
      user_id: '1',
      task_name: 'Review team performance',
      description: 'Conduct monthly team performance review',
      due_date: '2025-01-20',
      status: 'completed',
      created_at: '2025-01-08T14:30:00Z',
      updated_at: '2025-01-12T09:15:00Z',
      user: { id: '1', name: 'John Doe', email: 'john@company.com', role: 'member', created_at: '', updated_at: '' }
    },
    {
      id: '3',
      user_id: '2',
      task_name: 'Fix database issues',
      description: 'Resolve performance issues in the user database',
      due_date: '2025-01-12',
      status: 'blocked',
      created_at: '2025-01-05T16:45:00Z',
      updated_at: '2025-01-10T11:20:00Z',
      user: { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'member', created_at: '', updated_at: '' }
    }
  ];

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (user?.role === 'admin') {
        setTasks(mockTasks);
      } else {
        setTasks(mockTasks.filter(task => task.user_id === user?.id));
      }
      setLoading(false);
    };

    loadTasks();
  }, [user]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
    ));
  };

  const deleteTask = async (id: string) => {
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
    addTask,
    updateTask,
    deleteTask,
    filterTasks,
  };
};