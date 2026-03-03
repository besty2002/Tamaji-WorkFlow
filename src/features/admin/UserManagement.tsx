import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import { UserCheck, Shield, Eye, EyeOff } from 'lucide-react';

export function UserManagement() {
  const { profile: adminProfile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all users - accessible by admin and manager
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!adminProfile && (adminProfile.role === 'admin' || adminProfile.role === 'manager'),
  });

  // Update role - only admin can change roles
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Update team calendar permission - admin and manager can change
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, canView }: { userId: string, canView: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ can_view_all_leaves: canView })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const grantLeaveMutation = useMutation({
    mutationFn: async ({ userId, days, reason }: { userId: string, days: number, reason: string }) => {
      const { error } = await supabase
        .from('leave_grants')
        .insert([{
          user_id: userId,
          days: days,
          reason: reason,
          granted_by: adminProfile?.id
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      alert('休暇が正常に付与されました。');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
    onError: (err: any) => {
      alert('エラーが発生しました: ' + err.message);
    }
  });

  const handleGrantLeave = (userId: string, userEmail: string) => {
    const daysStr = prompt(`${userEmail} さんに付与する休暇日数（数値）を入力してください:`, '15');
    if (daysStr === null) return;
    
    const days = parseFloat(daysStr);
    if (isNaN(days) || days <= 0) {
      alert('有効な日数を入力してください。');
      return;
    }

    const reason = prompt('付与理由を入力してください（例：2026年度定期付与）:', '定期付与');
    if (reason === null) return;

    grantLeaveMutation.mutate({ userId, days, reason });
  };

  if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'manager') return <ErrorState message="アクセス権限がありません。管理者またはマネージャーのみアクセス可能です。" />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="ユーザーデータの取得中にエラーが発生しました。" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 flex items-center">
          <UserCheck className="w-7 h-7 mr-3 text-indigo-600" />
          ユーザー権限管理
        </h1>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-6 px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">登録済みメンバー一覧</h2>
            <div className="flex items-center text-[10px] font-bold text-slate-400">
              <Shield className="w-3 h-3 mr-1" />
              セキュリティポリシー適用中
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">メールアドレス / 氏名</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">役割</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">チームカレンダー参照権限</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">登録日</th>
                  <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users?.map((u) => {
                  const targetIsStaff = u.role === 'admin' || u.role === 'manager';
                  const isEmployee = u.role === 'employee';
                  
                  // Logical check for the UI state
                  const isChecked = targetIsStaff || u.can_view_all_leaves;
                  
                  // Permission to toggle: 
                  // 1. Current user must be Admin or Manager (already handled by page access)
                  // 2. Target must be an Employee (Staff are always allowed and cannot be disabled)
                  const canToggle = isEmployee && !updatePermissionMutation.isPending;

                  return (
                    <tr key={u.id} className="hover:bg-indigo-50/20 transition-all duration-200 group">
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">{u.email}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">{u.display_name || '名前未設定'}</div>
                      </td>
                      <td className="px-8 py-5">
                        <select
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                          disabled={roleMutation.isPending || u.id === adminProfile.id || adminProfile.role !== 'admin'}
                          className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="employee">一般社員</option>
                          <option value="manager">マネージャー</option>
                          <option value="admin">管理者</option>
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl border transition-all ${
                          isChecked ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-slate-100 border-slate-300 text-slate-400'
                        }`}>
                          <div className={`relative inline-flex items-center ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!canToggle}
                              onChange={(e) => updatePermissionMutation.mutate({ userId: u.id, canView: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </div>
                          <span className="text-[12px] font-black uppercase tracking-tight flex items-center">
                            {isChecked ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                            {targetIsStaff ? '常に許可' : (u.can_view_all_leaves ? '常に許可' : '参照制限')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-xs font-bold text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleGrantLeave(u.id, u.email)}
                          className="text-xs font-black text-indigo-600 hover:text-white hover:bg-indigo-600 px-4 py-2.5 rounded-xl border border-indigo-100 hover:border-indigo-600 transition-all shadow-sm"
                          disabled={grantLeaveMutation.isPending}
                        >
                          休暇付与
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
