import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('アカウントを作成しました。メールを確認して認証を完了してください（自動認証が有効な場合はそのままログインできます）。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || '認証中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>{isSignUp ? 'アカウント作成' : 'Tamajiにログイン'}</CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded">
                {error}
              </div>
            )}
            <Input
              label="メールアドレス"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="パスワード"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? '処理中...' : (isSignUp ? '新規登録' : 'ログイン')}
            </Button>
            
            <div className="text-center text-sm mt-4">
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'すでにアカウントをお持ちですか？ ログイン' : 'アカウントをお持ちでないですか？ 新規登録'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
