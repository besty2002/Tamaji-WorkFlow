import { useAuth } from '../auth/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { Profile } from '../../types/database';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner, ErrorState } from '../../components/ui/States';

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
    enabled: adminProfile?.role === 'admin',
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
    const daysStr = prompt(`${userEmail} さんに付与する休暇日数（数値）を入力してください:`, '15');
    if (daysStr === null) return;
    
    const days = parseFloat(daysStr);
    if (isNaN(days) || days <= 0) {
      alert('有効な日数を入力してください。');
      return;
    }

    const reason = prompt('付与する理由を入力してください（例：2026年度年次有給休暇）:', '定期付与');
    if (reason === null) return;

    grantLeaveMutation.mutate({ userId, days, reason });
  };

  if (adminProfile?.role !== 'admin') return <ErrorState message="アクセス権限がありません。管理者のみアクセス可能です。" />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="ユーザーデータの取得中にエラーが発生しました。" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
      </div>

      <Card>
        <CardHeader>登録ユーザー一覧</CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">権限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.display_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={u.role}
                        onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        disabled={roleMutation.isPending || u.id === adminProfile.id}
                        className="mt-1 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
                      >
                        <option value="employee">社員</option>
                        <option value="manager">マネージャー</option>
                        <option value="admin">管理者</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleGrantLeave(u.id, u.email)}
                        className="text-indigo-600 hover:text-indigo-900"
                        disabled={grantLeaveMutation.isPending}
                      >
                        休暇を付与
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
