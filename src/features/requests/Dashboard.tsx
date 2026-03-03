import { useAuth } from '../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import type { LeaveBalanceView, LeaveRequest } from '../../types/database';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

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

  if (balanceLoading || requestsLoading) return <LoadingSpinner />;
  if (balanceError || requestsError) {
    const errorMsg = (balanceError as any)?.message || (requestsError as any)?.message || 'ダッシュボードデータの読み込み中にエラーが発生しました。';
    return <ErrorState message={errorMsg} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ようこそ、 {profile?.display_name || 'ユーザー'}さん</h1>
        <Link to="/requests/new">
          <Button>新規申請</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-50 border-indigo-100">
          <CardHeader className="text-indigo-900">休暇残日数</CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-indigo-700">
              {balance?.balance ?? 0} <span className="text-lg font-normal">日</span>
            </div>
            <div className="text-sm text-indigo-600 mt-2">
              付与合計: {balance?.granted_sum ?? 0} | 使用済み: {balance?.used_sum ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>最近の申請</CardHeader>
        <CardContent className="p-0">
          {recentRequests && recentRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {recentRequests.map(req => (
                <div key={req.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-medium text-gray-900">
                      {format(new Date(req.start_date), 'yyyy年MM月dd일', { locale: ja })} 
                      {req.start_date !== req.end_date && ` - ${format(new Date(req.end_date), 'yyyy年MM月dd일', { locale: ja })}`}
                      {req.is_half_day && ` (${req.half_day_type === 'AM' ? '午前半休' : '午後半休'})`}
                    </div>
                    <div className="text-sm text-gray-500">{typeLabels[req.type]}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        req.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[req.status]}
                    </span>
                    <Link to={`/requests/${req.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm">
                      表示
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">最近の申請はありません。</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
