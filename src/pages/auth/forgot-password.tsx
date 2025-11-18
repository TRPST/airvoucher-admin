import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [supabaseClient] = useState(() => createClient());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://admin.arv-shop.com'}/auth/reset-password`;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

    if (error) {
      console.error('Supabase reset error:', error);
      setError('Failed to send reset email. Please try again.');
    } else {
      setSuccess(true);
      setEmail('');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    setError('An unexpected error occurred. Please try again.');
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
              <h2 className="text-3xl font-bold text-foreground">Forgot Password</h2>
              <p className="mt-3 text-base text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {success ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <p className="font-medium">Check your email</p>
                  <p className="mt-2">
                    If this email is registered with us, you will receive a password reset link shortly.
                    Please check your inbox and spam folder.
                  </p>
                </div>
                <Link
                  href="/auth"
                  className="text-center text-sm text-primary hover:underline"
                >
                  Return to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your email"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <span>Send Reset Link</span>
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
