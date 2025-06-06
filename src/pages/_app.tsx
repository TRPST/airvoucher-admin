import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { Layout } from "@/components/Layout";
import { TerminalProvider } from "@/contexts/TerminalContext";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Only show the application after first client-side render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Check for portal pages (new portal routing structure)
  const isPortalAuthPage = router.pathname.startsWith("/portal/") && router.pathname.endsWith("/auth");
  
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

  // For auth pages, landing page, and 404 page, render without Layout
  if (isAuthPage || isLandingPage || is404Page) {
    return (
      <ThemeProvider attribute="class">
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  // For protected pages, use Layout
  return (
    <ThemeProvider attribute="class">
      <ToastProvider>
        <TerminalProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </TerminalProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
