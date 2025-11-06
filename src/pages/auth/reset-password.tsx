import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [supabase] = useState(() => createClient());

  // Check for both implicit flow (hash) and PKCE (query) tokens
  useEffect(() => {
    const checkToken = () => {
      if (typeof window === 'undefined') return;
      
      // Check for implicit flow token in hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // Check for PKCE code in query params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      console.log('🔍 Checking for auth tokens');
      console.log('Hash (implicit):', { accessToken: !!accessToken, type });
      console.log('Query (PKCE):', { code: !!code });
      
      if (accessToken && type === 'recovery') {
        console.log('✅ Implicit flow recovery token found in hash');
        setHasValidSession(true);
        setError(null);
        setIsCheckingSession(false);
      } else if (code) {
        console.log('🔑 PKCE code detected - Supabase will auto-exchange via PASSWORD_RECOVERY event');
        // Don't try to exchange manually - let Supabase handle it
        // Just wait for the PASSWORD_RECOVERY event
      } else {
        console.log('⏳ No token yet, waiting for PASSWORD_RECOVERY event...');
      }
    };
    
    checkToken();
  }, []);

  // Listen for auth events (PASSWORD_RECOVERY for implicit, SIGNED_IN for PKCE)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, 'Session:', !!session);
      
      // Check if this is a password recovery flow
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const isRecoveryFlow = code || type === 'recovery';
      
      if ((event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryFlow)) && session) {
        console.log('🔐 Password recovery flow detected - session established!');
        setHasValidSession(true);
        setError(null);
        setIsCheckingSession(false);
        
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        if (code) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      setError('Password must contain at least one uppercase, one lowercase, and one number');
      setIsLoading(false);
      return;
    }

    if (!hasValidSession) {
      setError('No valid reset session. Please request a new password reset.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (data) console.log('✅ Password updated successfully', JSON.stringify(data, null, 2));
      if (error) throw error;
      
      setSuccess(true);
      
      await supabase.auth.signOut();
      
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:min-h-[520px] md:flex-row"
        >
          <div className="flex w-full flex-col gap-8 p-10 md:w-3/5">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Reset Password</h2>
              <p className="mt-3 text-base text-muted-foreground">
                Enter your new password below. Make sure it's strong and secure.
              </p>
            </div>

            {isCheckingSession ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Verifying reset token...</p>
              </div>
            ) : success ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <p className="font-medium">Password reset successful!</p>
                  <p className="mt-2">
                    Your password has been updated. Redirecting you to the login page...
                  </p>
                </div>
                <Link
                  href="/auth"
                  className="text-center text-sm text-primary hover:underline"
                >
                  Go to login now
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter new password"
                      disabled={!hasValidSession || isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-foreground">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Confirm new password"
                      disabled={!hasValidSession || isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={isLoading || !hasValidSession || isCheckingSession}
                    className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        <span>Resetting Password...</span>
                      </div>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>

                  <Link
                    href="/auth"
                    className="text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="relative flex h-56 w-full items-center justify-center bg-muted md:h-auto md:w-2/5">
            <Image
              src="/assets/airvoucher-logo.png"
              alt="AirVoucher Logo"
              width={420}
              height={420}
              className="h-40 w-40 object-contain md:h-52 md:w-52"
              priority
            />
          </div>
        </motion.div>
      </main>

      <footer className="py-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex justify-center text-sm text-muted-foreground">
            &copy; 2025 Airvoucher. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
