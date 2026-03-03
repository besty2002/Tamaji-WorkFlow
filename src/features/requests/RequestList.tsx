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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">自分の申請一覧</h1>
        <Link to="/requests/new">
          <Button>新規申請</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center py-3">
          <span>申請履歴</span>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-4 text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">種類</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(req.start_date), 'yyyy年MM月dd일', { locale: ja })}
                        {req.start_date !== req.end_date && ` - ${format(new Date(req.end_date), 'yyyy年MM月dd일', { locale: ja })}`}
                        {req.is_half_day && ` (${req.half_day_type === 'AM' ? '午前' : '午後'})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeLabels[req.type]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            req.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link to={`/requests/${req.id}`} className="text-indigo-600 hover:text-indigo-900">詳細</Link>
                        {(req.status === 'draft' || req.status === 'submitted') && (
                          <button 
                            onClick={() => {
                              if (confirm('この申請をキャンセルしてもよろしいですか？')) {
                                cancelMutation.mutate(req.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
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
            <EmptyState message="申請が見つかりませんでした。" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
