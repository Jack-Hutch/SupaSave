import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export function toast(message: string, type: ToastType = 'info', duration = 4000): void {
  const opts = { duration };
  switch (type) {
    case 'success':
      sonnerToast.success(message, opts);
      return;
    case 'error':
      sonnerToast.error(message, opts);
      return;
    case 'warning':
      sonnerToast.warning(message, opts);
      return;
    default:
      sonnerToast.info(message, opts);
  }
}

export function useToast() {
  return {
    success: (message: string) => toast(message, 'success'),
    error: (message: string) => toast(message, 'error'),
    warning: (message: string) => toast(message, 'warning'),
    info: (message: string) => toast(message, 'info'),
    toast,
  };
}
