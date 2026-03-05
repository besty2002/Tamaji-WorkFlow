import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Check, CheckCheck, Clock, Mail, BellOff, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { Notification } from '../../types/database';

export function NotificationList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profile,
  });

  // Mutation to mark a single notification as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount', profile?.id] });
    },
  });

  // Mutation to mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount', profile?.id] });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead.mutateAsync(notification.id);
    }
    if (notification.url) {
      navigate(notification.url);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">通知</h1>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            すべて既読にする
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <BellOff className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">通知はありません</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
              新しい通知が届くとここに表示されます。
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`group relative flex items-start p-4 rounded-2xl transition-all cursor-pointer border ${
                !notification.read_at
                  ? 'bg-white border-indigo-100 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-50'
                  : 'bg-slate-50/50 border-transparent hover:bg-white hover:border-slate-200'
              }`}
            >
              {!notification.read_at && (
                <div className="absolute top-4 right-4 h-2 w-2 bg-indigo-600 rounded-full"></div>
              )}
              
              <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                !notification.read_at ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
              }`}>
                {notification.type.includes('leave') ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
              </div>

              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-bold ${!notification.read_at ? 'text-slate-900' : 'text-slate-600'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {format(new Date(notification.created_at), 'MM/dd HH:mm', { locale: ja })}
                  </span>
                </div>
                <p className={`mt-1 text-sm line-clamp-2 ${!notification.read_at ? 'text-slate-600' : 'text-slate-500'}`}>
                  {notification.body}
                </p>
                <div className="mt-2 flex items-center space-x-3">
                  {notification.is_email_sent && (
                    <span className="flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Mail className="w-3 h-3 mr-1" />
                      EMAIL SENT
                    </span>
                  )}
                  {notification.read_at && (
                    <span className="flex items-center text-[10px] text-slate-400 font-medium">
                      <Check className="w-3 h-3 mr-1" />
                      既読
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
