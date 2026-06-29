import { AlertTriangle, Loader2, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { Button } from './Button';
import { Card, CardContent } from './Card';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  isLoading?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '実行する',
  cancelLabel = 'キャンセル',
  tone = 'default',
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
        disabled={isLoading}
      />
      <Card className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-none bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          aria-label="閉じる"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>
        <CardContent className="p-7">
          <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 id="confirm-dialog-title" className="pr-10 text-xl font-black text-slate-900">
            {title}
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{message}</p>
          {children && <div className="mt-5">{children}</div>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="rounded-2xl">
              {cancelLabel}
            </Button>
            <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={isLoading} className="rounded-2xl">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
