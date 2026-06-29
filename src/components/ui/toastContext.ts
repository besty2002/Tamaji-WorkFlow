import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);
