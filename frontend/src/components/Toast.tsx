/**
 * Toast compatibility wrapper for Sonner
 * Provides a drop-in replacement for the old toast system
 */

import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Re-export Sonner's toast with the old API
export function toast(message: string, type: ToastType = 'info', duration?: number) {
  const options = duration ? { duration } : undefined;

  switch (type) {
    case 'success':
      sonnerToast.success(message, options);
      break;
    case 'error':
      sonnerToast.error(message, options);
      break;
    case 'warning':
      sonnerToast.warning(message, options);
      break;
    case 'info':
    default:
      sonnerToast.info(message, options);
      break;
  }
}

// Convenience methods
toast.success = (message: string, duration?: number) => {
  sonnerToast.success(message, duration ? { duration } : undefined);
};

toast.error = (message: string, duration?: number) => {
  sonnerToast.error(message, duration ? { duration } : undefined);
};

toast.info = (message: string, duration?: number) => {
  sonnerToast.info(message, duration ? { duration } : undefined);
};

toast.warning = (message: string, duration?: number) => {
  sonnerToast.warning(message, duration ? { duration } : undefined);
};
