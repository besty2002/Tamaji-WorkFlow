import { useAuth } from '../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import type { LeaveBalanceView, LeaveRequest, LeaveGrant } from '../../types/database';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarDays, Plus, History, Clock } from 'lucide-react';

const typeLabels: Record<string, string> = {
  paid_leave: '年次有給休暇',
  sick: '病気休暇',
  special: '特別休暇',
  unpaid: '無給休暇'
};

const statusLabels: Record<string, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済み',
  rejected: '却下',
  cancelled: 'キャンセル'
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
      if (error && error.code !== 'PGRST116') throw error; // Ignore no rows error
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
    const errorMsg = (balanceError as any)?.message || (requestsError as any)?.message || (grantsError as any)?.message || 'データの読み込み中にエラーが発生しました。';
    return <ErrorState message={errorMsg} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            こんにちは、<span className="text-indigo-600">{profile?.display_name || 'ユーザー'}</span>さん
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">
            今日も素晴らしい一日になりますように。
          </p>
        </div>
        <Link to="/requests/new">
          <Button size="lg" className="rounded-2xl group px-6">
            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
            新規休暇申請
          </Button>
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-600 border-none relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <CalendarDays size={160} />
          </div>
          <CardContent className="p-8 text-white">
            <div className="text-indigo-100 font-bold text-sm uppercase tracking-wider mb-2 flex items-center">
              <div className="w-2 h-2 bg-indigo-300 rounded-full mr-2 animate-pulse"></div>
              現在の休暇残日数
            </div>
            <div className="flex items-baseline">
              <span className="text-6xl font-black tracking-tighter">
                {balance?.balance ?? 0}
              </span>
              <span className="text-2xl font-bold ml-2 opacity-80">日</span>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between text-xs font-semibold text-indigo-100">
              <span>付与：{balance?.granted_sum ?? 0}日</span>
              <span>使用：{balance?.used_sum ?? 0}日</span>
            </div>
          </CardContent>
        </Card>

        {/* Can add more cards here if needed */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        {/* Recent Requests */}
        <Card className="border-none">
          <CardHeader className="flex items-center space-x-2 bg-slate-50/50 py-4">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>最近の申請</span>
          </CardHeader>
          <CardContent className="p-0">
            {recentRequests && recentRequests.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentRequests.map(req => (
                  <div key={req.id} className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition-all group">
                    <div className="flex flex-col">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {format(new Date(req.start_date), 'yyyy年 MM月 dd日', { locale: ja })} 
                        {req.start_date !== req.end_date && ` 〜`}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-1 flex items-center">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 mr-2">
                          {typeLabels[req.type]}
                        </span>
                        {req.is_half_day && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">{req.half_day_type === 'AM' ? '午前' : '午後'}半休</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wide
                        ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                          req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          req.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                          'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[req.status]}
                      </span>
                      <Link to={`/requests/${req.id}`} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        表示
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium text-sm">最近の申請はありません。</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grant History */}
        <Card className="border-none">
          <CardHeader className="flex items-center space-x-2 bg-slate-50/50 py-4">
            <History className="w-5 h-5 text-emerald-500" />
            <span>休暇付与履歴</span>
          </CardHeader>
          <CardContent className="p-0">
            {grantHistory && grantHistory.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {grantHistory.map(grant => (
                  <div key={grant.id} className="p-5 flex justify-between items-center group">
                    <div className="flex flex-col">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {format(new Date(grant.granted_at), 'yyyy年 MM月 dd日', { locale: ja })}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-1">{grant.reason || '定期付与'}</div>
                    </div>
                    <div className="text-xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl">
                      +{grant.days}<span className="text-xs ml-0.5 opacity-70">日</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <History className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium text-sm">付与履歴がありません。</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
