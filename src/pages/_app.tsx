import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { Layout } from "@/components/Layout";
import { TerminalProvider } from "@/contexts/TerminalContext";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { SWRConfig } from "swr";
import { createClient } from "@/utils/supabase/client";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Only show the application after first client-side render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Global listener for password recovery events
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('🔐 Password recovery event detected, redirecting to reset-password page');
        router.push('/auth/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Check for portal pages (new portal routing structure)
  const isPortalAuthPage =
    router.pathname.startsWith("/portal/") && router.pathname.endsWith("/auth");

  // Original checks
  const isLandingPage = router.pathname === "/";
  const isAuthPage = router.pathname.startsWith("/auth") || isPortalAuthPage;
  const is404Page = router.pathname === "/404";

  // Render a loader initially before client-side code runs
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const swrConfigValue = {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    focusThrottleInterval: 5000,
    dedupingInterval: 2000,
    keepPreviousData: true,
    errorRetryCount: 3,
    errorRetryInterval: 3000,
    onError: (err: unknown) => {
      // Central logging hook for SWR errors
      // eslint-disable-next-line no-console
      console.error("SWR error", err);
    },
  };

  // For auth pages, landing page, and 404 page, render without Layout
  if (isAuthPage || isLandingPage || is404Page) {
    return (
      <ThemeProvider attribute="class">
        <SWRConfig value={swrConfigValue}>
          <ToastProvider>
            <Component {...pageProps} />
          </ToastProvider>
        </SWRConfig>
      </ThemeProvider>
    );
  }

  // For protected pages, use Layout
  return (
    <ThemeProvider attribute="class">
      <SWRConfig value={swrConfigValue}>
        <ToastProvider>
          <TerminalProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </TerminalProvider>
        </ToastProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
