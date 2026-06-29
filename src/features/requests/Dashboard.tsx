import { useAuth } from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import type { LeaveBalanceView, LeaveGrant, LeaveRequest } from '../../types/database';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { CalendarDays, Clock, History, Plus } from 'lucide-react';
import { getErrorMessage } from '../../lib/errors';

const typeLabels: Record<string, string> = {
  paid_leave: '年次有給休暇',
  sick: '病気休暇',
  special: '特別休暇',
  unpaid: '無給休暇',
};

const statusLabels: Record<string, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済み',
  rejected: '却下',
  cancelled: 'キャンセル済み',
};

export function Dashboard() {
  const { user, profile } = useAuth();

  const { data: balance, isLoading: balanceLoading, error: balanceError } = useQuery({
    queryKey: ['leaveBalance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balance_view')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as LeaveBalanceView) || { granted_sum: 0, used_sum: 0, balance: 0 };
    },
    enabled: !!user?.id,
  });

  const { data: recentRequests, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['recentRequests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user?.id,
  });

  const { data: grantHistory, isLoading: grantsLoading, error: grantsError } = useQuery({
    queryKey: ['grantHistory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_grants')
        .select('*')
        .eq('user_id', user?.id)
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return data as LeaveGrant[];
    },
    enabled: !!user?.id,
  });

  if (balanceLoading || requestsLoading || grantsLoading) return <LoadingSpinner />;
  if (balanceError || requestsError || grantsError) {
    return <ErrorState message={getErrorMessage(balanceError || requestsError || grantsError, 'データの読み込み中にエラーが発生しました。')} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            こんにちは、<span className="text-indigo-600">{profile?.display_name || 'ユーザー'}</span>さん
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">今日もスムーズに休暇を管理しましょう。</p>
        </div>
        <Link to="/requests/new">
          <Button size="lg" className="rounded-2xl px-6">
            <Plus className="w-5 h-5 mr-2" />
            新規休暇申請
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-600 border-none relative overflow-hidden md:col-span-1">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <CalendarDays size={160} />
          </div>
          <CardContent className="p-8 text-white">
            <div className="text-indigo-100 font-bold text-sm uppercase tracking-wider mb-2">現在の休暇残日数</div>
            <div className="flex items-baseline">
              <span className="text-6xl font-black tracking-tighter">{balance?.balance ?? 0}</span>
              <span className="text-2xl font-bold ml-2 opacity-80">日</span>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between text-xs font-semibold text-indigo-100">
              <span>付与: {balance?.granted_sum ?? 0}日</span>
              <span>使用: {balance?.used_sum ?? 0}日</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <Card className="border-none">
          <CardHeader className="flex items-center space-x-2 bg-slate-50/50 py-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>最近の申請</span>
          </CardHeader>
          <CardContent className="p-0">
            {recentRequests && recentRequests.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <div key={req.id} className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition-all">
                    <div>
                      <div className="font-bold text-slate-900">
                        {format(new Date(req.start_date), 'yyyy年 M月 d日')}
                        {req.start_date !== req.end_date && ` 〜 ${format(new Date(req.end_date), 'yyyy年 M月 d日')}`}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 mt-1">{typeLabels[req.type]}</div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-slate-100 text-slate-600">
                        {statusLabels[req.status]}
                      </span>
                      <Link to={`/requests/${req.id}`} className="p-2 text-slate-400 hover:text-indigo-600">表示</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-12 text-center text-slate-400 font-medium text-sm">最近の申請はありません。</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none">
          <CardHeader className="flex items-center space-x-2 bg-slate-50/50 py-4">
            <History className="w-5 h-5 text-emerald-500" />
            <span>休暇付与履歴</span>
          </CardHeader>
          <CardContent className="p-0">
            {grantHistory && grantHistory.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {grantHistory.map((grant) => (
                  <div key={grant.id} className="p-5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{format(new Date(grant.granted_at), 'yyyy年 M月 d日')}</div>
                      <div className="text-xs font-semibold text-slate-400 mt-1">{grant.reason || '定期付与'}</div>
                    </div>
                    <div className="text-xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">+{grant.days}日</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-12 text-center text-slate-400 font-medium text-sm">付与履歴はありません。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
