import { useState, useEffect, useRef } from 'react';
import { Leave, LeaveFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const useLeaves = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadLeaves = async () => {
      setLoading(true);
      let query = supabase
        .from('leaves')
        .select('*, user:members!user_id(*)'); // Join member data
      if (user?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching leaves:', error);
        if (isMounted) setLeaves([]);
      } else {
        if (isMounted) setLeaves(data || []);
      }
      if (isMounted) setLoading(false);
    };
    if (user) loadLeaves();

    // Setup Supabase real-time subscription
    if (user) {
      // Unsubscribe previous if any
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      // Subscribe to all changes on 'leaves'
      const channel = supabase.channel('leaves-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leaves',
          },
          async (payload) => {
            // Refetch all leaves on any change (insert/update/delete)
            await loadLeaves();
          }
        )
        .subscribe();
      subscriptionRef.current = channel;
    }
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user]);

  const addLeave = async (leaveData: Omit<Leave, 'id' | 'created_at' | 'updated_at' | 'user'>) => {
    setError(null);
    // Ensure from_date and to_date are null for single-day leaves
    const payload = {
      ...leaveData,
      leave_date: leaveData.category === 'multi-day' ? null : leaveData.leave_date,
      from_date: leaveData.from_date && leaveData.from_date !== '' ? leaveData.from_date : null,
      to_date: leaveData.to_date && leaveData.to_date !== '' ? leaveData.to_date : null,
      end_date: leaveData.end_date === '' ? null : leaveData.end_date,
    };
    delete payload.id; // Ensure id is not sent for insert
    console.log('Attempting to add leave with payload:', payload);
    const { data, error } = await supabase
      .from('leaves')
      .insert([payload])
      .select('*')
      .single();
    if (error) {
      setError(error.message || 'Error adding leave');
      console.error('Error adding leave:', error);
      return false;
    }
    if (data) {
      setLeaves(prev => [data, ...prev]);
      // Send webhook to n8n automation for leave added (to both URLs)
      try {
        await fetch('https://n8nautomation.site/webhook-test/onLeaveAdded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await fetch('https://n8nautomation.site/webhook-test/onleaveadded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            member_email: user?.email || '',
          }),
        });
        await fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            member_email: user?.email || '',
            event: 'leave-added',
          }),
        });
      } catch (webhookError) {
        console.error('Failed to send leave added webhook:', webhookError);
      }
      return true;
    }
    setError('Unknown error adding leave');
    return false;
  };

  const updateLeave = async (id: string, updates: Partial<Leave>) => {
    const payload = {
      ...updates,
      end_date: updates.end_date === '' ? null : updates.end_date,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('leaves')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('Error updating leave:', error);
    }
    if (data) {
      setLeaves(prev => prev.map(leave => (leave.id === id ? data : leave)));
      // Send webhook to n8n automation for leave updated
      try {
        await fetch('https://n8nautomation.site/webhook-test/taskaddedemail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            member_email: user?.email || '',
            event: 'leave-updated',
          }),
        });
      } catch (webhookError) {
        console.error('Failed to send leave updated webhook:', webhookError);
      }
    }
  };

  const deleteLeave = async (id: string) => {
    const { error } = await supabase.from('leaves').delete().eq('id', id);
    if (error) {
      console.error('Error deleting leave:', error);
    }
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
    error,
    addLeave,
    updateLeave,
    deleteLeave,
    filterLeaves,
    setLeaves, // <-- Export setLeaves
  };
};