'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCallback } from 'react';
import { getUserRole, signOutUser } from '@/actions/userActions';
import { fetchMyRetailer, RetailerProfile } from '@/actions/retailerActions';
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  FileText,
  ShoppingCart,
  History,
  User,
  Percent,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';
// Import Supabase client directly
import { createClient } from '@/utils/supabase/client';
import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';

import { cn } from '@/utils/cn';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTerminal } from '@/contexts/TerminalContext';

type UserRole = 'admin' | 'retailer' | 'agent' | 'terminal' | 'cashier';

interface LayoutProps {
  children: React.ReactNode;
  role?: UserRole;
  fullscreen?: boolean;
}

export function Layout({ children, role = 'admin', fullscreen = false }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [supabaseClient] = React.useState(() => createClient());
  // State to manage user and session
  const [user, setUser] = React.useState<any>(null);
  const [session, setSession] = React.useState<any>(null);
  const [retailerProfile, setRetailerProfile] = React.useState<RetailerProfile | null>(null);
  const { terminalName, retailerName, balance, availableCredit, isBalanceLoading } = useTerminal();

  // Debug balance changes
  React.useEffect(() => {
    if (role === 'cashier') {
      console.log(
        'Balance updated in Layout:',
        balance.toFixed(2),
        'Credit:',
        availableCredit.toFixed(2)
      );
    }
  }, [balance, availableCredit, role]);

  // Fetch user session on component mount
  React.useEffect(() => {
    // Get current session
    const fetchSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);

      // Listen for auth changes
      const { data: authListener } = supabaseClient.auth.onAuthStateChange(
        (event: string, currentSession: any) => {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      );

      // Cleanup listener on unmount
      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    fetchSession();
  }, [supabaseClient]);

  // Fetch retailer profile if user is a retailer
  React.useEffect(() => {
    const fetchRetailerProfile = async () => {
      if (role === 'retailer' && user?.id) {
        try {
          const { data, error } = await fetchMyRetailer(user.id);
          if (error) {
            console.error('Error fetching retailer profile:', error);
          } else {
            setRetailerProfile(data);
          }
        } catch (err) {
          console.error('Error fetching retailer profile:', err);
        }
      } else {
        setRetailerProfile(null);
      }
    };

    fetchRetailerProfile();
  }, [role, user?.id]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Use the signOutUser action instead of directly calling supabase
      const { error } = await signOutUser();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }

      // Redirect based on role
      if (role === 'cashier') {
        router.push('/auth/cashier');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Helper function to get user's role from profiles table
  const getUserRoleFromProfile = async (userId: string) => {
    // Use the getUserRole action instead of directly querying supabase
    const { data, error } = await getUserRole(userId);

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  };

  // Handle cross-portal navigation
  const handlePortalNavigation = useCallback(
    async (targetRole: UserRole) => {
      if (role !== targetRole) {
        try {
          console.log(`Switching from ${role} portal to ${targetRole} portal. Signing out first.`);
          // Sign out the current user using the action
          const { error: signOutError } = await signOutUser();
          if (signOutError) {
            console.error('Error signing out:', signOutError);
            return;
          }
          // Redirect to the auth page for the target role
          router.push(`/auth/${targetRole}`);
        } catch (error) {
          console.error('Error during portal navigation:', error);
        }
      }
    },
    [role, router]
  );

  // Generate navigation items based on user role
  const getNavItems = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return [
          {
            name: 'Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
          },
          {
            name: 'Agents',
            href: '/admin/agents',
            icon: Users,
          },
          {
            name: 'Retailers',
            href: '/admin/retailers',
            icon: Store,
          },
          {
            name: 'Vouchers',
            href: '/admin/vouchers',
            icon: CreditCard,
          },
          {
            name: 'Commissions',
            href: '/admin/commissions',
            icon: Percent,
          },
          {
            name: 'Reports',
            href: '/admin/reports',
            icon: FileText,
          },
          {
            name: 'Admins',
            href: '/admin/admins',
            icon: Shield,
          },
          {
            name: 'Settings',
            href: '/admin/settings',
            icon: Settings,
          },
          // Profile removed from sidebar nav
        ];
      case 'retailer':
        return [
          {
            name: 'Sell',
            href: '/retailer',
            icon: ShoppingCart,
          },
          {
            name: 'History',
            href: '/retailer/history',
            icon: History,
          },
          {
            name: 'Terminals',
            href: '/retailer/terminals',
            icon: CreditCard,
          },
          {
            name: 'Account',
            href: '/retailer/account',
            icon: User,
          },
        ];
      case 'agent':
        return [
          {
            name: 'Dashboard',
            href: '/agent',
            icon: LayoutDashboard,
          },
          {
            name: 'Retailers',
            href: '/agent/retailers',
            icon: Store,
          },
          {
            name: 'Commissions',
            href: '/agent/commissions',
            icon: Percent,
          },
          // Profile removed from sidebar nav
        ];
      case 'terminal':
        return [
          {
            name: 'Sell',
            href: '/terminal',
            icon: ShoppingCart,
          },
          {
            name: 'History',
            href: '/terminal/history',
            icon: History,
          },
          {
            name: 'Account',
            href: '/terminal/account',
            icon: User,
          },
        ];
      case 'cashier':
        // Cashiers have no sidebar navigation
        return [];
      default:
        return [];
    }
  };

  // Get bottom tab items for mobile (excludes Reports which stays in sidebar)
  const getBottomTabItems = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return [
          {
            name: 'Retailers',
            href: '/admin/retailers',
            icon: Store,
          },
          {
            name: 'Agents',
            href: '/admin/agents',
            icon: Users,
          },
          {
            name: 'Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
          },
          {
            name: 'Vouchers',
            href: '/admin/vouchers',
            icon: CreditCard,
          },
          {
            name: 'Commissions',
            href: '/admin/commissions',
            icon: Percent,
          },
        ];
      case 'retailer':
        return [
          {
            name: 'Sell',
            href: '/retailer',
            icon: ShoppingCart,
          },
          {
            name: 'History',
            href: '/retailer/history',
            icon: History,
          },
          {
            name: 'Terminals',
            href: '/retailer/terminals',
            icon: CreditCard,
          },
          {
            name: 'Account',
            href: '/retailer/account',
            icon: User,
          },
        ];
      case 'agent':
        return [
          {
            name: 'Retailers',
            href: '/agent/retailers',
            icon: Store,
          },
          {
            name: 'Dashboard',
            href: '/agent',
            icon: LayoutDashboard,
          },
          {
            name: 'Commissions',
            href: '/agent/commissions',
            icon: Percent,
          },
        ];
      case 'terminal':
        return [
          {
            name: 'Sell',
            href: '/terminal',
            icon: ShoppingCart,
          },
          {
            name: 'History',
            href: '/terminal/history',
            icon: History,
          },
          {
            name: 'Account',
            href: '/terminal/account',
            icon: User,
          },
        ];
      case 'cashier':
        // Cashiers have no bottom tab navigation
        return [];
      default:
        return [];
    }
  };

  // Get sidebar-only items for mobile (only Reports for admin, empty for others)
  const getMobileSidebarItems = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return [
          {
            name: 'Reports',
            href: '/admin/reports',
            icon: FileText,
          },
        ];
      case 'retailer':
      case 'agent':
      case 'terminal':
      case 'cashier':
        return [];
      default:
        return [];
    }
  };

  const navItems = getNavItems(role);
  const bottomTabItems = getBottomTabItems(role);
  const mobileSidebarItems = getMobileSidebarItems(role);

  // Fullscreen layout (no sidebar, no navbar)
  if (fullscreen) {
    return <div className="bg-background text-foreground">{children}</div>;
  }

  // Regular layout for other roles
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Mobile top nav */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background p-4 md:hidden">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-2 rounded-md p-2 hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <img src="/assets/airvoucher-logo.png" alt="AirVoucher Logo" className="h-8" />
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Mobile sidebar (drawer) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background p-4 animate-in slide-in-from-left md:hidden">
            <div className="flex justify-end">
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-center">
                <h1 className="flex items-center text-2xl font-bold">
                  <img
                    src="/assets/airvoucher-logo.png"
                    alt="AirVoucher Logo"
                    className="mr-2 h-8"
                  />
                </h1>
              </div>
            </div>
            <nav className="mt-8 flex flex-col space-y-1">
              {mobileSidebarItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            {user && (
              <div className="absolute bottom-16 left-4 right-4">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="flex w-full items-center rounded-md border-0 p-3 outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                      aria-label="User menu"
                      style={{
                        outline: 'none !important',
                        border: 'none !important',
                      }}
                    >
                      <Avatar.Root className="mr-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                        <Avatar.Fallback>{user.email.charAt(0).toUpperCase()}</Avatar.Fallback>
                      </Avatar.Root>
                      <div className="flex-1 text-left">
                        <p className="truncate text-sm font-medium">{user.email}</p>
                      </div>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="z-50 min-w-[200px] overflow-hidden border-0 bg-background p-1 shadow-none outline-none ring-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 focus:border-0 focus:outline-none focus:ring-0"
                      style={{
                        boxShadow: 'none !important',
                        outline: 'none !important',
                        border: 'none !important',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <DropdownMenu.Item
                        className="group flex cursor-pointer items-center rounded-md border-0 px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 data-[highlighted]:border-0 data-[highlighted]:bg-muted data-[highlighted]:outline-none data-[state=open]:outline-none"
                        onSelect={handleSignOut}
                      >
                        <motion.div
                          className="flex w-full items-center justify-between"
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.1, ease: 'easeOut' }}
                        >
                          <div className="flex items-center">
                            <LogOut className="mr-3 h-5 w-5" />
                            Sign Out
                          </div>
                          <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </motion.div>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">© 2025 AirVoucher</div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-background p-4 md:block">
        <div className="flex h-full flex-col">
          <div className="mb-4">
            <div className="flex items-center justify-center">
              <h1 className="flex items-center text-2xl font-bold">
                <img src="/assets/airvoucher-logo.png" alt="AirVoucher Logo" className="mr-2 h-8" />
              </h1>
            </div>
          </div>

          <nav className="flex flex-1 flex-col space-y-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100',
                    pathname === item.href ? 'opacity-100' : ''
                  )}
                />
              </Link>
            ))}
          </nav>
          {/* Spacer to push user info and footer to bottom */}
          <div className="flex-1"></div>

          {/* User info placed at bottom of sidebar with drop-up menu */}
          {user && (
            <div className="mb-4 mt-auto">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    className="flex w-full items-center rounded-md border-0 p-3 outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                    aria-label="User menu"
                    style={{
                      outline: 'none !important',
                      border: 'none !important',
                    }}
                  >
                    <Avatar.Root className="mr-3 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                      <Avatar.Fallback>
                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div className="flex-1 text-left">
                      <p className="truncate text-sm font-medium">{user?.email || 'User'}</p>
                    </div>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="top"
                    align="start"
                    sideOffset={8}
                    className="z-50 min-w-[200px] overflow-hidden border-0 bg-background p-1 shadow-none outline-none ring-0 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 focus:border-0 focus:outline-none focus:ring-0"
                    style={{
                      boxShadow: 'none !important',
                      outline: 'none !important',
                      border: 'none !important',
                      borderRadius: '0.375rem',
                    }}
                  >
                    <DropdownMenu.Item
                      className="group flex cursor-pointer items-center rounded-md border-0 px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus:border-0 focus:outline-none focus:ring-0 data-[highlighted]:border-0 data-[highlighted]:bg-muted data-[highlighted]:outline-none data-[state=open]:outline-none"
                      onSelect={handleSignOut}
                    >
                      <motion.div
                        className="flex w-full items-center justify-between"
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                      >
                        <div className="flex items-center">
                          <LogOut className="mr-3 h-5 w-5" />
                          Sign Out
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </motion.div>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">© 2025 AirVoucher</div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-7xl p-4 pb-20 md:p-6 md:pb-4 lg:p-8 lg:pb-8">{children}</div>
      </main>

      {/* Mobile bottom tab navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background md:hidden">
        <nav className="flex items-center justify-around px-2 py-2">
          {bottomTabItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center justify-center rounded-md px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('mb-1 h-5 w-5', isActive ? 'text-primary' : '')} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
