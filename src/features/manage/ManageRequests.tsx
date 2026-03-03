import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import type { LeaveRequest } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState, EmptyState } from '../../components/ui/States';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ClipboardList, CheckCircle2, XCircle } from 'lucide-react';

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

export function ManageRequests() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data as LeaveRequest[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    const channel = supabase.channel('public:leave_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    const actionName = newStatus === 'approved' ? '承認' : '却下';
    const comment = prompt(`この申請を${actionName}する理由を入力してください:` + (newStatus === 'rejected' ? ' (必須)' : ' (任意)'));
    
    if (newStatus === 'rejected' && !comment) {
      alert('却下する場合は理由を入力してください。');
      return;
    }
    if (comment === null) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: newStatus,
          manager_comment: comment || null,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      alert('更新中にエラーが発生しました: ' + err.message);
    }
  };

  if (profile?.role === 'employee') return <ErrorState message="アクセス権限がありません。" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <ClipboardList className="w-6 h-6 mr-2 text-indigo-600" />
          休暇申請の管理
        </h1>
      </div>

      <Card className="border-none shadow-lg shadow-slate-200/50 overflow-hidden">
        <CardHeader className="flex justify-between items-center bg-slate-50/50 py-4">
          <span className="text-sm font-bold text-slate-600 tracking-wide uppercase">すべての申請</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border-slate-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 font-medium"
          >
            <option value="submitted">承認待ち (申請中)</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
            <option value="all">すべて</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20"><LoadingSpinner /></div>
          ) : error ? (
            <ErrorState message={error} />
          ) : requests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">申請者</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日付</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">日数</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">理由</th>
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">ステータス</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{req.profiles?.display_name || req.profiles?.email?.split('@')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{req.profiles?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">
                          {format(new Date(req.start_date), 'yyyy/MM/dd', { locale: ja })}
                          {req.start_date !== req.end_date && ` 〜`}
                        </div>
                        <div className="text-[10px] font-bold text-indigo-500 uppercase">{typeLabels[req.type]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-indigo-600">
                        {req.num_days || (req.is_half_day ? 0.5 : '-')} <span className="text-[10px] font-bold text-slate-400">日</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 max-w-xs truncate" title={req.reason || ''}>
                        {req.reason || '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {req.status === 'submitted' && (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleAction(req.id, 'approved')} 
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="承認"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleAction(req.id, 'rejected')} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="却下"
                            >
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
            <div className="py-20 flex flex-col items-center">
              <EmptyState message={`${statusFilter === 'all' ? '' : statusLabels[statusFilter]}の申請が見つかりませんでした。`} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
