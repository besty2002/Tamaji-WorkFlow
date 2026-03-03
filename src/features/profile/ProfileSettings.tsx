import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useQueryClient } from '@tanstack/react-query';

export function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'プロフィールを更新しました。' });
      
      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      queryClient.invalidateQueries({ queryKey: ['approvedRequests'] });
      
      // Manually trigger a refresh in context just in case real-time is slow
      await refreshProfile();
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新中にエラーが発生しました。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">プロフィール設定</h1>
      
      <Card>
        <CardHeader>基本情報</CardHeader>
        <CardContent>
          {message && (
            <div className={`p-3 mb-4 rounded text-sm ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                メールアドレス
              </label>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 sm:text-sm">
                {user?.email}
              </div>
              <p className="mt-1 text-xs text-gray-400">メールアドレスは変更できません。</p>
            </div>

            <Input
              label="表示名 (氏名)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：山田 太郎"
              required
            />

            <div className="pt-4 border-t flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? '保存中...' : '変更を保存'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
