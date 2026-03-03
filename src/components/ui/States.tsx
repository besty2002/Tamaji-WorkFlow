interface ErrorProps {
  message?: string;
}

export function ErrorState({ message = 'エラーが発生しました。' }: ErrorProps) {
  return (
    <div className="flex justify-center items-center h-full p-4 text-red-500">
      <span>{message}</span>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}

export function EmptyState({ message = 'データがありません。' }: { message?: string }) {
  return (
    <div className="flex justify-center items-center p-8 text-gray-500 bg-gray-50 rounded border border-dashed border-gray-300">
      {message}
    </div>
  );
}
