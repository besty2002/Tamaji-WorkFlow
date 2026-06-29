import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { format } from 'date-fns';
import { CheckCircle2, ClipboardList, Paperclip, XCircle } from 'lucide-react';
import { getErrorMessage } from '../../lib/errors';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';

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

export function ManageRequests() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [actionDialog, setActionDialog] = useState<{
    id: string;
    status: 'approved' | 'rejected';
    comment: string;
  } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leave_requests')
        .select(`*, profiles:user_id (id, display_name, email)`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data as LeaveRequest[]);
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, '申請データの取得中にエラーが発生しました。'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('public:leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, fetchRequests)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    setActionDialog({ id, status: newStatus, comment: '' });
  };

  const submitAction = async () => {
    if (!actionDialog) return;

    const comment = actionDialog.comment.trim();
    if (actionDialog.status === 'rejected' && !comment) {
      showToast({ variant: 'error', message: '却下する場合は理由を入力してください。' });
      return;
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: actionDialog.status,
          manager_comment: comment || null,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', actionDialog.id);
      if (error) throw error;
      fetchRequests();
      showToast({
        variant: 'success',
        message: actionDialog.status === 'approved' ? '申請を承認しました。' : '申請を却下しました。',
      });
      setActionDialog(null);
    } catch (err: unknown) {
      showToast({ variant: 'error', message: `更新中にエラーが発生しました: ${getErrorMessage(err)}` });
    }
  };

  if (profile?.role === 'employee') return <ErrorState message="アクセス権限がありません。" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 flex items-center">
          <ClipboardList className="w-7 h-7 mr-3 text-indigo-600" />
          休暇申請の管理
        </h1>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30 p-6 md:p-8">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">申請一覧</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full sm:w-auto bg-white border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
          >
            <option value="submitted">承認待ち (申請中)</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
            <option value="all">すべて表示</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24"><LoadingSpinner /></div>
          ) : error ? (
            <ErrorState message={error} />
          ) : requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/30">
                  <tr>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">申請者</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日付</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日数</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">理由</th>
                    <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                    <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-indigo-50/10 transition-all duration-200">
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">{req.profiles?.display_name || req.profiles?.email?.split('@')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{req.profiles?.email}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">
                          {format(new Date(req.start_date), 'yyyy年 M月 d日')}
                          {req.start_date !== req.end_date && ` 〜 ${format(new Date(req.end_date), 'yyyy年 M月 d日')}`}
                        </div>
                        <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tight">{typeLabels[req.type]}</div>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-indigo-600">{req.num_days || (req.is_half_day ? 0.5 : '-')} 日</td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-500 max-w-xs">
                        <div className="flex items-center space-x-2">
                          {req.attachment_url && (
                            <a href={req.attachment_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="添付ファイルを表示">
                              <Paperclip className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <span className="truncate">{req.reason || '-'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-100">
                          {statusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {req.status === 'submitted' && (
                          <div className="flex items-center justify-end space-x-1">
                            <button onClick={() => handleAction(req.id, 'approved')} className="p-2.5 text-green-500 hover:bg-green-50 rounded-xl transition-all" title="承認">
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleAction(req.id, 'rejected')} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="却下">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center">
              <EmptyState message="該当する申請はありません。" />
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!actionDialog}
        title={actionDialog?.status === 'approved' ? '申請を承認しますか？' : '申請を却下しますか？'}
        message={actionDialog?.status === 'approved' ? '承認理由は任意で入力できます。' : '却下する場合は理由の入力が必要です。'}
        confirmLabel={actionDialog?.status === 'approved' ? '承認する' : '却下する'}
        tone={actionDialog?.status === 'rejected' ? 'danger' : 'default'}
        onCancel={() => setActionDialog(null)}
        onConfirm={submitAction}
      >
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          理由
        </label>
        <textarea
          value={actionDialog?.comment ?? ''}
          onChange={(event) => setActionDialog((current) => current ? { ...current, comment: event.target.value } : current)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          rows={4}
          placeholder={actionDialog?.status === 'approved' ? '必要に応じて承認理由を入力してください。' : '却下理由を入力してください。'}
        />
      </ConfirmDialog>
    </div>
  );
}
