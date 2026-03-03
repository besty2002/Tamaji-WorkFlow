import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest, Profile } from '../../types/database';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, ChevronRight, Trash2, Filter, User, X } from 'lucide-react';

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
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager';

  // Fetch users for filtering (only for staff)
  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isStaff,
  });

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['requests', filterUser, isStaff],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (!isStaff) {
        // Employees only see their own
        query = query.eq('user_id', user?.id);
      } else if (filterUser !== 'all') {
        // Staff filtering by specific user
        query = query.eq('user_id', filterUser);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (LeaveRequest & { profiles: { display_name: string | null; email: string } })[];
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
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      alert('申請を削除しました。');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
    onError: (err: any) => {
      alert('削除に失敗しました: ' + err.message);
    }
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="申請データの取得中にエラーが発生しました。" />;

  const filteredRequests = requests?.filter(req => filterStatus === 'all' || req.status === filterStatus) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-black text-slate-900 flex items-center">
          <Calendar className="w-7 h-7 mr-3 text-indigo-600" />
          {isStaff && filterUser === 'all' ? '全社員の申請一覧' : '申請一覧'}
        </h1>
        <Link to="/requests/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-2xl px-6 py-6 h-auto font-black shadow-lg shadow-indigo-100">
            新規申請を作成
          </Button>
        </Link>
      </div>

      {/* Filters Section */}
      <Card className="border-none shadow-sm bg-slate-50/50 p-4 md:p-6 rounded-[2rem]">
        <div className="flex flex-col md:flex-row gap-4">
          {isStaff && (
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                <User className="w-3 h-3 mr-1" /> 社員で絞り込む
              </label>
              <select 
                value={filterUser} 
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full bg-white border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              >
                <option value="all">全員を表示</option>
                <option value={user?.id}>自分の申請のみ</option>
                {users?.filter(u => u.id !== user?.id).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.email.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={`${isStaff ? 'flex-1' : 'w-full md:w-64'} space-y-1.5`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> ステータス
            </label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-white border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="all">すべてのステータス</option>
              {Object.entries(statusLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          {filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">申請者 / 日付</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日数 / 種類</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                    <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-indigo-50/10 transition-all duration-200 group">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          {isStaff && (
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5">
                              {req.profiles?.display_name || req.profiles?.email.split('@')[0]}
                            </span>
                          )}
                          <span className="text-sm font-bold text-slate-900">
                            {format(new Date(req.start_date), 'yyyy/MM/dd', { locale: ja })}
                            {req.start_date !== req.end_date && ` 〜`}
                          </span>
                          {req.is_half_day && (
                            <span className="mt-1 w-fit text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-lg border border-amber-100 font-black uppercase">
                              半休 ({req.half_day_type})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-indigo-600">
                            {req.num_days || (req.is_half_day ? 0.5 : '-')} <span className="text-[10px] font-bold text-slate-400">日</span>
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {typeLabels[req.type]}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-wider border
                          ${req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' : 
                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                            req.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            'bg-slate-50 text-slate-500 border-slate-100'}`}>
                          {statusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <Link 
                          to={`/requests/${req.id}`} 
                          className="inline-flex items-center justify-center p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="詳細を表示"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                        
                        {/* Cancel button for owner */}
                        {req.user_id === user?.id && (req.status === 'draft' || req.status === 'submitted') && (
                          <button 
                            onClick={() => {
                              if (confirm('この申請をキャンセルしてもよろしいですか？')) {
                                cancelMutation.mutate(req.id);
                              }
                            }}
                            className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                            title="キャンセル"
                            disabled={cancelMutation.isPending}
                          >
                            <X size={20} className={cancelMutation.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}

                        {/* Delete button for Staff (Any status) or Owner (Draft only) */}
                        {(isStaff || (req.user_id === user?.id && req.status === 'draft')) && (
                          <button 
                            onClick={() => {
                              const msg = req.status === 'approved' 
                                ? 'この申請は【承認済み】です。削除するとカレンダーからも消去されます。本当によろしいですか？'
                                : 'この申請を完全に削除してもよろしいですか？';
                              if (confirm(msg)) {
                                deleteMutation.mutate(req.id);
                              }
                            }}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="削除"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={20} className={deleteMutation.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center">
              <EmptyState message="申請履歴が見つかりませんでした。" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
