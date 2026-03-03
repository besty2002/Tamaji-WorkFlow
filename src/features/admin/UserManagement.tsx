import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import { UserCheck, Shield, Eye, EyeOff, Loader2, User, Calendar as CalendarIcon, Settings } from 'lucide-react';

export function UserManagement() {
  const { profile: adminProfile } = useAuth();
  const queryClient = useQueryClient();

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
    onError: (err: any) => {
      alert('役割の更新に失敗しました: ' + err.message);
    }
  });

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
    onError: (err: any) => {
      alert('参照権限の更新に失敗しました: ' + err.message);
    }
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

  if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'manager') return <ErrorState message="アクセス権限がありません。" />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="ユーザーデータの取得中にエラーが発生しました。" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center">
          <UserCheck className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-indigo-600" />
          ユーザー権限管理
        </h1>
      </div>

      {/* Stats Summary for Mobile (Optional but nice) */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">総メンバー</div>
          <div className="text-xl font-black text-slate-900">{users?.length || 0} 名</div>
        </div>
        <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-indigo-100 shadow-lg">
          <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">管理者/マネージャー</div>
          <div className="text-xl font-black text-white">{users?.filter(u => u.role !== 'employee').length || 0} 名</div>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 md:py-6 px-6 md:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">メンバー一覧</h2>
            <div className="hidden md:flex items-center text-[10px] font-bold text-slate-400">
              <Shield className="w-3 h-3 mr-1" />
              セキュリティポリシー適用中
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Desktop View (Table) - Shown on md and up */}
          <div className="hidden md:block overflow-x-auto">
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
                  const isChecked = targetIsStaff || !!u.can_view_all_leaves;
                  const isUpdating = updatePermissionMutation.isPending && updatePermissionMutation.variables?.userId === u.id;
                  const canToggle = u.role === 'employee' && !updatePermissionMutation.isPending;

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
                          <button
                            type="button"
                            onClick={() => canToggle && updatePermissionMutation.mutate({ userId: u.id, canView: !isChecked })}
                            disabled={!canToggle}
                            className={`relative inline-flex items-center transition-all ${canToggle ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-80'}`}
                          >
                            <div className={`w-11 h-6 rounded-full transition-colors ${isChecked ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                            <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>
                              {isUpdating && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                            </div>
                          </button>
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

          {/* Mobile View (Card-based) - Hidden on md and up */}
          <div className="md:hidden divide-y divide-slate-100">
            {users?.map((u) => {
              const targetIsStaff = u.role === 'admin' || u.role === 'manager';
              const isChecked = targetIsStaff || !!u.can_view_all_leaves;
              const isUpdating = updatePermissionMutation.isPending && updatePermissionMutation.variables?.userId === u.id;
              const canToggle = u.role === 'employee' && !updatePermissionMutation.isPending;

              return (
                <div key={u.id} className="p-6 space-y-5">
                  {/* Header: User Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 leading-tight truncate max-w-[180px]">{u.email}</div>
                        <div className="text-xs font-bold text-slate-400 mt-0.5">{u.display_name || '名前未設定'}</div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                      u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' :
                      u.role === 'manager' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                      'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {u.role === 'admin' ? '管理者' : u.role === 'manager' ? 'マネージャー' : '一般社員'}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    {/* Role Select */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">役割設定</label>
                      <select
                        value={u.role}
                        onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        disabled={roleMutation.isPending || u.id === adminProfile.id || adminProfile.role !== 'admin'}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50"
                      >
                        <option value="employee">一般社員</option>
                        <option value="manager">マネージャー</option>
                        <option value="admin">管理者</option>
                      </select>
                    </div>

                    {/* Permission Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">チームカレンダー参照</label>
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        isChecked ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                      }`}>
                        <span className="text-[11px] font-black uppercase tracking-tight flex items-center">
                          {isChecked ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
                          {targetIsStaff ? '常に許可' : (u.can_view_all_leaves ? '常に許可' : '参照制限')}
                        </span>
                        <button
                          type="button"
                          onClick={() => canToggle && updatePermissionMutation.mutate({ userId: u.id, canView: !isChecked })}
                          disabled={!canToggle}
                          className={`relative inline-flex items-center transition-all ${canToggle ? 'cursor-pointer' : 'cursor-default opacity-50'}`}
                        >
                          <div className={`w-10 h-5 rounded-full transition-colors ${isChecked ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center shadow-sm`}>
                            {isUpdating && <Loader2 className="w-2.5 h-2.5 text-indigo-600 animate-spin" />}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-[10px] font-bold text-slate-400">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      登録日: {new Date(u.created_at).toLocaleDateString('ja-JP')}
                    </div>
                    <button 
                      onClick={() => handleGrantLeave(u.id, u.email)}
                      className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-4 py-2.5 rounded-xl border border-indigo-100 transition-all shadow-sm flex items-center"
                      disabled={grantLeaveMutation.isPending}
                    >
                      <Settings className="w-3 h-3 mr-1.5" />
                      休暇付与
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
