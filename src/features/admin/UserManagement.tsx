import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Edit2, Eye, EyeOff, History, Loader2, PlusCircle, Settings, Shield, Trash2, User, UserCheck, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import type { LeaveBalanceView, LeaveGrant, Profile, Role } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';

const roleLabels: Record<Role, string> = {
  employee: '一般社員',
  manager: 'マネージャー',
  admin: '管理者',
};

type GrantModalState = {
  isOpen: boolean;
  userId: string;
  userEmail: string;
  editGrant?: LeaveGrant;
};

type HistoryModalState = {
  isOpen: boolean;
  userId: string;
  userEmail: string;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function UserManagement() {
  const { profile: adminProfile } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [grantModal, setGrantModal] = useState<GrantModalState>({ isOpen: false, userId: '', userEmail: '' });
  const [historyModal, setHistoryModal] = useState<HistoryModalState>({ isOpen: false, userId: '', userEmail: '' });
  const [grantDays, setGrantDays] = useState('15');
  const [grantReason, setGrantReason] = useState('定期付与');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const canManageUsers = adminProfile?.role === 'admin';
  const isAdmin = adminProfile?.role === 'admin';

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: canManageUsers,
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['allBalances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_balance_view').select('*');
      if (error) throw error;
      return data as LeaveBalanceView[];
    },
    enabled: canManageUsers,
  });

  const { data: userGrants, isLoading: grantsLoading } = useQuery({
    queryKey: ['userGrants', historyModal.userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_grants')
        .select('*')
        .eq('user_id', historyModal.userId)
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return data as LeaveGrant[];
    },
    enabled: historyModal.isOpen && !!historyModal.userId,
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `権限の更新に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, canView }: { userId: string; canView: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ can_view_all_leaves: canView })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `カレンダー閲覧権限の更新に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast({ variant: 'success', message: 'ユーザーを削除しました。' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allBalances'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `ユーザーの削除に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  const grantLeaveMutation = useMutation({
    mutationFn: async ({ userId, days, reason, id }: { userId: string; days: number; reason: string; id?: string }) => {
      if (id) {
        const { error } = await supabase.from('leave_grants').update({ days, reason }).eq('id', id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('leave_grants').insert([{
        user_id: userId,
        days,
        reason,
        granted_by: adminProfile?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      showToast({ variant: 'success', message: variables.id ? '休暇付与データを更新しました。' : '休暇を付与しました。' });
      closeGrantModal();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allBalances'] });
      queryClient.invalidateQueries({ queryKey: ['userGrants'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `休暇付与の保存に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  const deleteGrantMutation = useMutation({
    mutationFn: async (grantId: string) => {
      const { error } = await supabase.from('leave_grants').delete().eq('id', grantId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast({ variant: 'success', message: '休暇付与データを削除しました。' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allBalances'] });
      queryClient.invalidateQueries({ queryKey: ['userGrants'] });
    },
    onError: (err: unknown) => {
      showToast({ variant: 'error', message: `休暇付与データの削除に失敗しました: ${getErrorMessage(err)}` });
    },
  });

  const openGrantModal = (user: Profile, grant?: LeaveGrant) => {
    setGrantModal({ isOpen: true, userId: user.id, userEmail: user.email, editGrant: grant });
    setGrantDays(grant ? String(grant.days) : '15');
    setGrantReason(grant?.reason || '定期付与');
  };

  const closeGrantModal = () => {
    setGrantModal({ isOpen: false, userId: '', userEmail: '' });
    setGrantDays('15');
    setGrantReason('定期付与');
  };

  const handleGrantSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const days = Number(grantDays);

    if (!Number.isFinite(days) || days <= 0) {
      showToast({ variant: 'error', message: '有効な日数を入力してください。' });
      return;
    }

    grantLeaveMutation.mutate({
      userId: grantModal.userId,
      days,
      reason: grantReason.trim(),
      id: grantModal.editGrant?.id,
    });
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (userId === adminProfile?.id) {
      showToast({ variant: 'error', message: '自分自身のアカウントは削除できません。' });
      return;
    }

    setConfirmAction({
      title: 'ユーザーを削除しますか？',
      message: `${email} を削除します。関連する休暇申請も削除されます。`,
      confirmLabel: '削除する',
      onConfirm: () => deleteUserMutation.mutate(userId),
    });
  };

  const handleDeleteGrant = (grantId: string) => {
    setConfirmAction({
      title: '休暇付与データを削除しますか？',
      message: '削除すると、この付与日数はユーザーの残日数に反映されなくなります。',
      confirmLabel: '削除する',
      onConfirm: () => deleteGrantMutation.mutate(grantId),
    });
  };

  if (!canManageUsers) return <ErrorState message="このページにアクセスする権限がありません。" />;
  if (usersLoading || balancesLoading) return <LoadingSpinner />;
  if (usersError) return <ErrorState message="ユーザーデータの取得中にエラーが発生しました。" />;

  const balanceFor = (userId: string) => balances?.find((balance) => balance.user_id === userId);
  const privilegedCount = users?.filter((user) => user.role !== 'employee').length ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center">
          <UserCheck className="w-6 h-6 md:w-7 md:h-7 mr-2 md:mr-3 text-indigo-600" />
          ユーザー権限・休暇管理
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">メンバー数</div>
          <div className="text-xl font-black text-slate-900">{users?.length ?? 0} 名</div>
        </div>
        <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-indigo-100 shadow-lg">
          <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">管理者・マネージャー</div>
          <div className="text-xl font-black text-white">{privilegedCount} 名</div>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 md:py-6 px-6 md:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">メンバー一覧</h2>
            <div className="hidden md:flex items-center text-[10px] font-bold text-slate-400">
              <Shield className="w-3 h-3 mr-1" />
              権限ポリシー適用中
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">氏名 / メールアドレス</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">役割</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">休暇残高</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">カレンダー閲覧</th>
                  <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users?.map((user) => {
                  const balance = balanceFor(user.id);
                  const isStaffUser = user.role === 'admin' || user.role === 'manager';
                  const canViewAll = isStaffUser || user.can_view_all_leaves;
                  const canToggleCalendar = user.role === 'employee' && !updatePermissionMutation.isPending;

                  return (
                    <tr key={user.id} className="hover:bg-indigo-50/20 transition-all duration-200 group">
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">{user.display_name || '名前未設定'}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">{user.email}</div>
                      </td>
                      <td className="px-8 py-5">
                        <select
                          value={user.role}
                          onChange={(event) => roleMutation.mutate({ userId: user.id, role: event.target.value as Role })}
                          disabled={roleMutation.isPending || user.id === adminProfile?.id || !isAdmin}
                          className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          {Object.entries(roleLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-400">付与 {balance?.granted_sum ?? 0}</span>
                          <span className="text-xs font-bold text-red-400">使用 {balance?.used_sum ?? 0}</span>
                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                            残り {balance?.balance ?? 0}日
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl border transition-all ${
                          canViewAll ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-slate-100 border-slate-300 text-slate-400'
                        }`}>
                          <button
                            type="button"
                            onClick={() => canToggleCalendar && updatePermissionMutation.mutate({ userId: user.id, canView: !canViewAll })}
                            disabled={!canToggleCalendar}
                            className={`relative inline-flex items-center transition-all ${canToggleCalendar ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-80'}`}
                          >
                            <div className={`w-11 h-6 rounded-full transition-colors ${canViewAll ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                            <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${canViewAll ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>
                              {updatePermissionMutation.isPending && updatePermissionMutation.variables?.userId === user.id && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                            </div>
                          </button>
                          <span className="text-[12px] font-black uppercase tracking-tight flex items-center">
                            {canViewAll ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                            {isStaffUser ? '常に許可' : canViewAll ? '許可' : '制限中'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setHistoryModal({ isOpen: true, userId: user.id, userEmail: user.email })}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="付与履歴"
                        >
                          <History className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openGrantModal(user)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="休暇を付与"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        {isAdmin && user.id !== adminProfile?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="ユーザー削除"
                            disabled={deleteUserMutation.isPending}
                          >
                            {deleteUserMutation.isPending && deleteUserMutation.variables === user.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {users?.map((user) => {
              const balance = balanceFor(user.id);
              const isStaffUser = user.role === 'admin' || user.role === 'manager';
              const canViewAll = isStaffUser || user.can_view_all_leaves;

              return (
                <div key={user.id} className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 leading-tight truncate">{user.display_name || '名前未設定'}</div>
                        <div className="text-xs font-bold text-slate-400 mt-0.5 truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                      {roleLabels[user.role]}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">休暇残高</span>
                    <span className="text-sm font-black text-indigo-600">{balance?.balance ?? 0}日</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>{canViewAll ? 'カレンダー閲覧: 許可' : 'カレンダー閲覧: 制限中'}</span>
                    <span>作成日: {new Date(user.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryModal({ isOpen: true, userId: user.id, userEmail: user.email })}
                      className="text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-100 transition-all shadow-sm flex items-center"
                    >
                      <History className="w-3 h-3 mr-1.5" />
                      履歴
                    </button>
                    <button
                      type="button"
                      onClick={() => openGrantModal(user)}
                      className="text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-2.5 rounded-xl border border-indigo-100 transition-all shadow-sm flex items-center"
                    >
                      <Settings className="w-3 h-3 mr-1.5" />
                      付与
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="閉じる"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
          />
          <Card className="relative w-full max-w-lg border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 bg-white">
            <CardHeader className="bg-slate-900 text-white p-6 border-none relative">
              <button
                type="button"
                onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-tight flex items-center">
                <History className="w-5 h-5 mr-3 text-indigo-400" />
                休暇付与履歴
              </h2>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-1">{historyModal.userEmail}</p>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {grantsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
              ) : userGrants && userGrants.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {userGrants.map((grant) => (
                    <div key={grant.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                          {format(new Date(grant.granted_at), 'yyyy年 MM月 dd日')}
                        </div>
                        <div className="text-sm font-bold text-slate-900">{grant.reason || '理由なし'}</div>
                        <div className="text-lg font-black text-indigo-600 mt-1">+{grant.days}<span className="text-[10px] ml-0.5">日</span></div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => openGrantModal({ id: grant.user_id, email: historyModal.userEmail, display_name: null, role: 'employee', can_view_all_leaves: false, created_at: '' }, grant)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGrant(grant.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 font-bold">付与履歴がありません。</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {grantModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="閉じる"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => !grantLeaveMutation.isPending && closeGrantModal()}
          />
          <Card className="relative w-full max-w-md border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 bg-white">
            <CardHeader className="bg-slate-900 text-white p-8 border-none relative">
              <button
                type="button"
                onClick={closeGrantModal}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
                disabled={grantLeaveMutation.isPending}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                {grantModal.editGrant ? <Edit2 className="w-7 h-7 text-white" /> : <PlusCircle className="w-7 h-7 text-white" />}
              </div>
              <h2 className="text-2xl font-black tracking-tight">{grantModal.editGrant ? '休暇付与の修正' : '休暇を特別付与'}</h2>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1">{grantModal.userEmail}</p>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleGrantSubmit} className="space-y-6">
                <Input
                  label="付与日数"
                  type="number"
                  step="0.5"
                  value={grantDays}
                  onChange={(event) => setGrantDays(event.target.value)}
                  className="rounded-2xl py-4 text-lg font-black border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-500"
                  placeholder="例: 15"
                  required
                />
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">付与理由</label>
                  <textarea
                    value={grantReason}
                    onChange={(event) => setGrantReason(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    rows={3}
                    placeholder="理由を入力してください。"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 rounded-2xl py-4 font-bold border-slate-200" onClick={closeGrantModal} disabled={grantLeaveMutation.isPending}>
                    キャンセル
                  </Button>
                  <Button type="submit" className="flex-1 rounded-2xl py-4 font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200" disabled={grantLeaveMutation.isPending}>
                    {grantLeaveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : grantModal.editGrant ? '修正を保存' : '付与する'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmLabel={confirmAction?.confirmLabel}
        tone="danger"
        isLoading={deleteUserMutation.isPending || deleteGrantMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
