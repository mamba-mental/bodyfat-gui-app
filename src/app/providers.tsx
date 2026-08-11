'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from '@/contexts/theme-context';
import { AppProvider } from '@/contexts/app-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { MainLayout } from '@/components/layout/main-layout';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AppProvider>
        <ErrorBoundary>
          <MainLayout>
            <div id="main-content" className="min-h-screen">
              {children}
            </div>
          </MainLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: 'var(--card)',
                color: 'var(--card-foreground)',
                border: '1px solid var(--border)',
              },
            }}
          />
        </ErrorBoundary>
      </AppProvider>
    </ThemeProvider>
  );
}
