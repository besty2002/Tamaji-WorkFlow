import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, ChevronRight } from 'lucide-react';

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

export function RequestList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['myRequests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRequests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance', user?.id] });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="申請データの取得中にエラーが発生しました。" />;

  const filteredRequests = requests?.filter(req => filterStatus === 'all' || req.status === filterStatus) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-indigo-600" />
          自分の申請一覧
        </h1>
        <Link to="/requests/new">
          <Button className="rounded-xl">新規申請</Button>
        </Link>
      </div>

      <Card className="border-none shadow-lg shadow-slate-200/50 overflow-hidden">
        <CardHeader className="flex justify-between items-center bg-slate-50/50 py-4">
          <span className="text-sm font-bold text-slate-600 tracking-wide uppercase">申請履歴</span>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border-slate-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 font-medium"
          >
            <option value="all">すべてのステータス</option>
            <option value="draft">下書き</option>
            <option value="submitted">申請中</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日付</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日数</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">種類</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {format(new Date(req.start_date), 'yyyy/MM/dd', { locale: ja })}
                        {req.start_date !== req.end_date && ` 〜`}
                        {req.is_half_day && <span className="ml-2 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">{req.half_day_type}</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-600">
                        {req.num_days || (req.is_half_day ? 0.5 : '-')} <span className="text-[10px] font-bold text-slate-400">日</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                        {typeLabels[req.type]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider
                          ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            req.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                            req.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                            'bg-slate-100 text-slate-600'}`}>
                          {statusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <Link to={`/requests/${req.id}`} className="text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center">
                          詳細 <ChevronRight className="w-4 h-4 ml-0.5" />
                        </Link>
                        {(req.status === 'draft' || req.status === 'submitted') && (
                          <button 
                            onClick={() => {
                              if (confirm('この申請をキャンセルしてもよろしいですか？')) {
                                cancelMutation.mutate(req.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            disabled={cancelMutation.isPending}
                          >
                            キャンセル
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center">
              <EmptyState message="申請が見つかりませんでした。" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
