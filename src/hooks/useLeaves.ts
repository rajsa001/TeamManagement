import { useState, useEffect } from 'react';
import { Leave, LeaveFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useLeaves = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Mock data
  const mockLeaves: Leave[] = [
    {
      id: '1',
      user_id: '1',
      leave_date: '2025-01-25',
      leave_type: 'casual',
      reason: 'Family vacation',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-10T10:00:00Z',
      user: { id: '1', name: 'John Doe', email: 'john@company.com', role: 'member', created_at: '', updated_at: '' }
    },
    {
      id: '2',
      user_id: '2',
      leave_date: '2025-02-14',
      leave_type: 'sick',
      reason: 'Medical appointment',
      created_at: '2025-01-08T14:30:00Z',
      updated_at: '2025-01-08T14:30:00Z',
      user: { id: '2', name: 'Jane Smith', email: 'jane@company.com', role: 'member', created_at: '', updated_at: '' }
    }
  ];

  useEffect(() => {
    const loadLeaves = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (user?.role === 'admin') {
        setLeaves(mockLeaves);
      } else {
        setLeaves(mockLeaves.filter(leave => leave.user_id === user?.id));
      }
      setLoading(false);
    };

    loadLeaves();
  }, [user]);

  const addLeave = async (leaveData: Omit<Leave, 'id' | 'created_at' | 'updated_at'>) => {
    const newLeave: Leave = {
      ...leaveData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLeaves(prev => [...prev, newLeave]);
  };

  const deleteLeave = async (id: string) => {
    setLeaves(prev => prev.filter(leave => leave.id !== id));
  };

  const filterLeaves = (filters: LeaveFilters) => {
    return leaves.filter(leave => {
      if (filters.member && leave.user_id !== filters.member) return false;
      if (filters.leave_type && leave.leave_type !== filters.leave_type) return false;
      if (filters.month || filters.year) {
        const leaveDate = new Date(leave.leave_date);
        if (filters.month && leaveDate.getMonth() + 1 !== filters.month) return false;
        if (filters.year && leaveDate.getFullYear() !== filters.year) return false;
      }
      return true;
    });
  };

  return {
    leaves,
    loading,
    addLeave,
    deleteLeave,
    filterLeaves,
  };
};