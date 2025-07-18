import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      console.log('Current user:', user);
      console.log('Fetched notifications:', data, 'Error:', error);
      if (error) {
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      {loading ? (
        <div className="text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-500">No notifications.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map(n => (
            <Card key={n.id + '-' + n.created_at} className="flex items-center justify-between p-4 border border-gray-200 bg-white">
              <div>
                <div className="font-semibold text-gray-900">{n.title}</div>
                <div className="text-sm text-gray-700">{n.message}</div>
                <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.is_read && (
                <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(n.id)}>
                  Mark as Read
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage; 