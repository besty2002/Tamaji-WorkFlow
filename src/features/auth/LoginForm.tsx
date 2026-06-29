import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { useToast } from '../../components/ui/useToast';

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return '認証中にエラーが発生しました。入力内容を確認してください。';
  }

  if (error.message === 'Invalid login credentials') {
    return 'メールアドレスまたはパスワードが正しくありません。';
  }

  return getErrorMessage(error, '認証中にエラーが発生しました。入力内容を確認してください。');
}

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isSupabaseConfigured) {
      setError('Supabase の接続設定が見つかりません。.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定し、開発サーバーを再起動してください。');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data?.session) {
          navigate('/');
        } else {
          showToast({
            variant: 'success',
            title: 'アカウントを作成しました',
            message: 'メール確認が必要な場合は、確認後にログインしてください。',
          });
          setIsSignUp(false);
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4">
      <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-200 text-white mb-6">
          <Calendar className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Tamaji</h1>
        <p className="text-slate-500 font-medium">スマートな休暇管理システム</p>
      </div>

      <Card className="w-full max-w-[400px] border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-200">
        <CardContent className="p-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            {isSignUp ? '新規アカウント作成' : 'ログイン'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isSupabaseConfigured && (
              <div className="p-4 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl">
                Supabase の接続設定が未設定です。ローカルでログインするには .env.local を作成してください。
              </div>
            )}

            {error && (
              <div className="p-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl animate-in shake duration-300">
                {error}
              </div>
            )}

            <Input
              label="メールアドレス"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl py-3"
            />
            <Input
              label="パスワード"
              type="password"
              placeholder="8文字以上"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl py-3"
            />
            <Button
              className="w-full py-4 rounded-2xl text-base font-bold mt-4 shadow-lg shadow-indigo-200"
              type="submit"
              disabled={loading}
            >
              {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
            </Button>

            <div className="text-center mt-8">
              <button
                type="button"
                className="text-slate-400 hover:text-indigo-600 font-bold text-sm transition-colors"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
              >
                {isSignUp ? 'すでにアカウントをお持ちですか？ログイン' : 'アカウントをお持ちでないですか？新規登録'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mt-12 text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">
        © 2026 Tamaji Workflow. All rights reserved.
      </p>
    </div>
  );
}
