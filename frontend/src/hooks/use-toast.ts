'use client';

import { useToastContext } from '@/components/ui/toast-provider';

/**
 * Acesso aos toasts globais. O estado e o container vivem no `ToastProvider`
 * (montado no layout raiz), então qualquer tela pode simplesmente chamar
 * `const { error } = useToast()` e a mensagem aparece.
 */
export function useToast() {
  const ctx = useToastContext();

  if (!ctx) {
    // Fallback defensivo: fora do provider, os toasts viram no-op (não quebram a tela).
    const noop = () => '';
    return {
      toasts: [],
      addToast: noop,
      removeToast: () => {},
      success: noop,
      error: noop,
      warning: noop,
      info: noop,
    };
  }

  return ctx;
}
