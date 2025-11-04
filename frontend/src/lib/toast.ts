import { toast as sonnerToast } from 'sonner';

/**
 * Toast notification utility using sonner
 * Mobile-first toast notifications with smooth animations
 */

export const toast = {
  success: (message: string, duration?: number) =>
    sonnerToast.success(message, { duration }),

  error: (message: string, duration?: number) =>
    sonnerToast.error(message, { duration }),

  info: (message: string, duration?: number) =>
    sonnerToast.info(message, { duration }),

  warning: (message: string, duration?: number) =>
    sonnerToast.warning(message, { duration }),

  loading: (message: string) =>
    sonnerToast.loading(message),

  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => sonnerToast.promise(promise, { loading, success, error }),
};
