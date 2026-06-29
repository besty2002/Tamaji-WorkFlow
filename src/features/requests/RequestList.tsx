import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, ChevronRight, Filter, Trash2, User, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import type { LeaveRequest, LeaveStatus, LeaveType, Profile } from '../../types/database';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';

const typeLabels: Record<LeaveType, string> = {
  paid_leave: '年次有給休暇',
  sick: '病気休暇',
  special: '特別休暇',
  unpaid: '無給休暇',
};

const statusLabels: Record<LeaveStatus, string> = {
  draft: '下書き',
  submitted: '申請中',
  approved: '承認済み',
  rejected: '却下',
  cancelled: 'キャンセル済み',
};

type RequestWithProfile = LeaveRequest & {
  profiles: Pick<Profile, 'display_name' | 'email'> | null;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function RequestList() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | LeaveStatus>('all');
  const [filterUser, setFilterUser] = useState('all');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager';

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
    queryKey: ['requests', filterUser, isStaff, user?.id],
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
        query = query.eq('user_id', user?.id);
      } else if (filterUser !== 'all') {
        query = query.eq('user_id', filterUser);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RequestWithProfile[];
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
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `キャンセルに失敗しました: ${getErrorMessage(err)}` });
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
      showToast({ variant: 'success', message: '申請を削除しました。' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `削除に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="申請データの取得中にエラーが発生しました。" />;

  const filteredRequests = requests?.filter((req) => filterStatus === 'all' || req.status === filterStatus) ?? [];

  const getApplicantName = (req: RequestWithProfile) =>
    req.profiles?.display_name || req.profiles?.email?.split('@')[0] || '未設定';

  const handleCancel = (requestId: string) => {
    setConfirmAction({
      title: '申請をキャンセルしますか？',
      message: 'キャンセルすると、この申請は承認対象から外れます。',
      confirmLabel: 'キャンセルする',
      onConfirm: () => cancelMutation.mutate(requestId),
    });
  };

  const handleDelete = (req: LeaveRequest) => {
    const message =
      req.status === 'approved'
        ? 'この申請は承認済みです。削除するとカレンダーからも表示されなくなります。削除しますか？'
        : 'この申請を削除しますか？';

    setConfirmAction({
      title: '申請を削除しますか？',
      message,
      confirmLabel: '削除する',
      onConfirm: () => deleteMutation.mutate(req.id),
    });
  };

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

      <Card className="border-none shadow-sm bg-slate-50/50 p-4 md:p-6 rounded-[2rem]">
        <div className="flex flex-col md:flex-row gap-4">
          {isStaff && (
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                <User className="w-3 h-3 mr-1" />
                社員で絞り込む
              </label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              >
                <option value="all">全員を表示</option>
                <option value={user?.id}>自分の申請のみ</option>
                {users?.filter((u) => u.id !== user?.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.email.split('@')[0]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`${isStaff ? 'flex-1' : 'w-full md:w-64'} space-y-1.5`}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" />
              ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | LeaveStatus)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="all">すべてのステータス</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="py-24 flex flex-col items-center">
              <EmptyState message="申請履歴が見つかりませんでした。" />
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
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
                                {getApplicantName(req)}
                              </span>
                            )}
                            <span className="text-sm font-bold text-slate-900">
                              {format(new Date(req.start_date), 'yyyy年 M月 d日')}
                              {req.start_date !== req.end_date && ` 〜 ${format(new Date(req.end_date), 'yyyy年 M月 d日')}`}
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
                            <span className="text-xs font-semibold text-slate-400">{typeLabels[req.type]}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-wider border ${
                            req.status === 'approved'
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : req.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : req.status === 'submitted'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
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
                          {req.user_id === user?.id && (req.status === 'draft' || req.status === 'submitted') && (
                            <button
                              type="button"
                              onClick={() => handleCancel(req.id)}
                              className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                              title="キャンセル"
                              disabled={cancelMutation.isPending}
                            >
                              <X size={20} className={cancelMutation.isPending ? 'animate-spin' : ''} />
                            </button>
                          )}
                          {(isStaff || (req.user_id === user?.id && req.status === 'draft')) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(req)}
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

              <div className="md:hidden divide-y divide-slate-50">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="p-5 hover:bg-indigo-50/5 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        {isStaff && (
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5">
                            {getApplicantName(req)}
                          </span>
                        )}
                        <span className="text-base font-black text-slate-900 leading-tight">
                          {format(new Date(req.start_date), 'yyyy年 M月 d日')}
                          {req.start_date !== req.end_date && ` 〜 ${format(new Date(req.end_date), 'yyyy年 M月 d日')}`}
                        </span>
                        <div className="flex items-center mt-1.5 space-x-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded-md uppercase tracking-tight">
                            {typeLabels[req.type]}
                          </span>
                          {req.is_half_day && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 font-black uppercase">
                              半休
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-wider border shadow-sm ${
                        req.status === 'approved'
                          ? 'bg-green-50 text-green-700 border-green-100 shadow-green-100/50'
                          : req.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-100 shadow-red-100/50'
                            : req.status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-blue-100/50'
                              : 'bg-slate-50 text-slate-500 border-slate-100 shadow-slate-100/50'
                      }`}>
                        {statusLabels[req.status]}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">取得日数</span>
                        <div className="text-lg font-black text-indigo-600 flex items-baseline">
                          {req.num_days || (req.is_half_day ? 0.5 : '-')}
                          <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">日</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/requests/${req.id}`}
                          className="p-3 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                        {req.user_id === user?.id && (req.status === 'draft' || req.status === 'submitted') && (
                          <button
                            type="button"
                            onClick={() => handleCancel(req.id)}
                            className="p-3 text-amber-600 bg-amber-50/50 hover:bg-amber-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                            disabled={cancelMutation.isPending}
                          >
                            <X size={20} className={cancelMutation.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}
                        {(isStaff || (req.user_id === user?.id && req.status === 'draft')) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(req)}
                            className="p-3 text-red-600 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={20} className={deleteMutation.isPending ? 'animate-spin' : ''} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.confirmLabel}
        tone="danger"
        isLoading={cancelMutation.isPending || deleteMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
