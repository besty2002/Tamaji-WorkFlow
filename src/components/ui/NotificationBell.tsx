import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../features/auth/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function NotificationBell() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [hasNew, setHasNew] = useState(false);

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotificationsCount', profile?.id],
    queryFn: async () => {
      if (!profile) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .is('read_at', null);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile,
  });

  useEffect(() => {
    if (!profile) return;

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`user-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          // Invalidate query to refetch count
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount', profile.id] });
          setHasNew(true);
          
          // Reset "hasNew" animation after 3 seconds
          setTimeout(() => setHasNew(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, queryClient]);

  return (
    <Link
      to="/notifications"
      className={`relative p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all ${
        hasNew ? 'animate-bounce text-indigo-600' : ''
      }`}
      title="通知"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
