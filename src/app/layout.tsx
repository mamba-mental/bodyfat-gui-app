import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";
import { AppProvider } from "@/contexts/app-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "sonner";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ap³𝘹Fit.ai – 𝛼 (Alpha) | AI-Powered Fitness Analytics",
  description: "Advanced body composition analysis and fitness tracking with AI-powered insights and PRIME calculations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Script id="extension-hydration-fix" strategy="beforeInteractive">
          {`
            // Fix hydration mismatches caused by browser extensions
            (function() {
              // Suppress hydration warnings in development
              if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
                const originalWarn = console.warn;
                console.warn = function(...args) {
                  if (typeof args[0] === 'string' && (
                    args[0].includes('data-darkreader-mode') ||
                    args[0].includes('data-darkreader-scheme') ||
                    args[0].includes('data-nighteye') ||
                    args[0].includes('data-night-mode') ||
                    args[0].includes('Hydration failed')
                  )) {
                    // Skip browser extension hydration warnings
                    return;
                  }
                  originalWarn.apply(console, args);
                };
              }
              
              // Mark document as extension-aware
              if (typeof document !== 'undefined') {
                document.documentElement.setAttribute('data-extension-aware', 'true');
              }
            })();
          `}
        </Script>
        <Script id="global-error-logger" strategy="afterInteractive">
          {`
            (function(){
              function log(type, payload){
                try { console[type]('[AppError]', payload); } catch(e){}
              }
              window.addEventListener('error', function(e){
                // Filter out extension-related errors
                if (e.message && (
                  e.message.includes('darkreader') ||
                  e.message.includes('nighteye') ||
                  e.message.includes('extension')
                )) {
                  return;
                }
                log('error', { kind:'error', message:e.message, filename:e.filename, lineno:e.lineno, colno:e.colno, error:e.error && e.error?.stack });
              }, true);
              window.addEventListener('unhandledrejection', function(e){
                log('error', { kind:'unhandledrejection', reason:(e.reason && e.reason.stack) || String(e.reason) });
              });
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Skip Navigation Link */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AppProvider>
            <ErrorBoundary>
              <MainLayout>{children}</MainLayout>
              <Toaster 
                position="top-right" 
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
            </ErrorBoundary>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
