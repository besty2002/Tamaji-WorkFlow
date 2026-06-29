const DEFAULT_ERROR_MESSAGE = 'エラーが発生しました。';

export function getErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  const normalized = message.toLowerCase();

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Supabase に接続できませんでした。.env.local の設定、Supabase プロジェクト、ネットワーク状態を確認してください。';
  }

  if (normalized.includes('supabase configuration is missing')) {
    return 'Supabase の接続設定が見つかりません。.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。';
  }

  return message || fallback;
}
