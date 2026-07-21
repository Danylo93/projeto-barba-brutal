'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ToastContainer, ToastProps } from '@/components/ui/toast';

type ToastInput = Omit<ToastProps, 'id' | 'onClose'>;

export interface ToastContextValue {
  toasts: ToastProps[];
  addToast: (toast: ToastInput) => string;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Provider único de toasts. Montado uma vez no layout raiz, ele mantém o estado
 * e renderiza o `ToastContainer` global — assim qualquer `useToast()` na árvore
 * consegue exibir mensagens (antes cada tela precisava montar o próprio
 * container, o que nunca acontecia e deixava os toasts invisíveis).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: ToastInput) => {
      const id = Math.random().toString(36).slice(2, 11);
      const novo: ToastProps = { ...toast, id, onClose: removeToast };
      setToasts((prev) => [...prev, novo]);
      if (toast.duration !== 0) {
        setTimeout(() => removeToast(id), toast.duration || 5000);
      }
      return id;
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    [addToast],
  );
  const error = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    [addToast],
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'warning', title, description }),
    [addToast],
  );
  const info = useCallback(
    (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
