import { CustomAuth } from '@/components/CustomAuth';
import { motion } from 'framer-motion';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg"
        >
          <h2 className="mb-6 text-center text-2xl font-bold">Admin Login</h2>
          <CustomAuth role="admin" />
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
