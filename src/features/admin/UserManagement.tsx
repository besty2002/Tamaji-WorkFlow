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
      alert('休暇を正常に付与しました。');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
    },
    onError: (err: any) => {
      alert('エラーが発生しました: ' + err.message);
    }
  });

  const handleGrantLeave = (userId: string, userEmail: string) => {
    const daysStr = prompt(`${userEmail} 님에게 부여할 휴가 일수(숫자)를 입력하세요:`, '15');
    if (daysStr === null) return;
    
    const days = parseFloat(daysStr);
    if (isNaN(days) || days <= 0) {
      alert('유효한 일수를 입력하세요.');
      return;
    }

    const reason = prompt('부여 사유를 입력하세요 (예: 2026년도 정기 연차):', '정기 부여');
    if (reason === null) return;

    grantLeaveMutation.mutate({ userId, days, reason });
  };

  if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'manager') return <ErrorState message="접근 권한이 없습니다. 관리자 또는 매니저만 접근 가능합니다." />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="사용자 데이터를 가져오는 중 오류가 발생했습니다." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 flex items-center">
          <UserCheck className="w-7 h-7 mr-3 text-indigo-600" />
          사용자 권한 관리
        </h1>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-6 px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">등록된 팀원 목록</h2>
            <div className="flex items-center text-[10px] font-bold text-slate-400">
              <Shield className="w-3 h-3 mr-1" />
              보안 정책 활성 중
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">이메일 / 성명</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">시스템 역할</th>
                  <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">팀 캘린더 조회 권한</th>
                  <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users?.map((u) => {
                  const isAdminOrManager = u.role !== 'employee';
                  const canView = isAdminOrManager || u.can_view_all_leaves;
                  
                  return (
                    <tr key={u.id} className="hover:bg-indigo-50/20 transition-all duration-200 group">
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-slate-900">{u.email}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">{u.display_name || '이름 미설정'}</div>
                      </td>
                      <td className="px-8 py-5">
                        <select
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                          disabled={roleMutation.isPending || u.id === adminProfile.id || adminProfile.role !== 'admin'}
                          className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="employee">일반 사원</option>
                          <option value="manager">매니저</option>
                          <option value="admin">최고 관리자</option>
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl border transition-all ${
                          canView ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-slate-100 border-slate-300 text-slate-400'
                        }`}>
                          <div className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={canView}
                              disabled={isAdminOrManager || updatePermissionMutation.isPending}
                              onChange={(e) => updatePermissionMutation.mutate({ userId: u.id, canView: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </div>
                          <span className="text-[12px] font-black uppercase tracking-tight flex items-center">
                            {canView ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                            {isAdminOrManager ? '항시 허용됨' : (u.can_view_all_leaves ? '조회 허용' : '조회 차단')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleGrantLeave(u.id, u.email)}
                          className="text-xs font-black text-indigo-600 hover:text-white hover:bg-indigo-600 px-4 py-2.5 rounded-xl border border-indigo-100 hover:border-indigo-600 transition-all shadow-sm"
                          disabled={grantLeaveMutation.isPending}
                        >
                          휴가 일수 부여
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
