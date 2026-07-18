'use client';

import { ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Loading } from '@/components/ui/loading';

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function LazyLoad({ 
  children, 
  fallback = <Loading text="Carregando..." />, 
  threshold = 0.1,
  rootMargin = '50px'
}: LazyLoadProps) {
  const [ref, entry] = useIntersectionObserver({
    threshold,
    rootMargin,
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref}>
      {entry?.isIntersecting ? children : fallback}
    </div>
  );
}
