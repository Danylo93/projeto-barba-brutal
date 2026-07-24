'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// Cor do ícone e da barra lateral por tipo (tema escuro do app).
const accent = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

const barra = {
  success: 'bg-green-400',
  error: 'bg-red-400',
  warning: 'bg-yellow-400',
  info: 'bg-blue-400',
};

export function Toast({
  id,
  title,
  description,
  type = 'info',
  onClose,
}: ToastProps) {
  const Icon = icons[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
      className="pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-4 pl-5 shadow-2xl shadow-black/40"
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${barra[type]}`} aria-hidden />
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${accent[type]}`} />
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-sm font-semibold leading-5 text-white">{title}</p>
        )}
        {description && (
          <p className="mt-0.5 text-sm leading-5 text-zinc-400 break-words">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 rounded-md text-zinc-500 transition-colors hover:text-white focus:outline-none"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="relative">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
