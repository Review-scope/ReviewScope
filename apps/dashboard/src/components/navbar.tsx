'use client';

import Link from 'next/link';
import { LayoutDashboard, Users, LogIn, LogOut, ShieldCheck, HelpCircle, Shield, CreditCard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

// Admin GitHub IDs - must match admin/page.tsx
const ADMIN_GITHUB_IDS = ['134628559'];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // @ts-expect-error session.user.id exists
  const isAdmin = session?.user?.id && ADMIN_GITHUB_IDS.includes(session.user.id);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl mr-8 hover:opacity-80 transition-opacity">
          <img src="/logo1.png" alt="ReviewScope" className="w-8 h-8 object-contain" />
          <span className="tracking-tighter italic uppercase font-black">Review<span className="text-primary">Scope</span></span>
        </Link>
        
        <div className="flex gap-1 md:gap-4 flex-1">
          <Link 
            href="/dashboard" 
            className={clsx(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-accent hover:text-accent-foreground",
              pathname === "/dashboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Repositories</span>
          </Link>
          <Link 
            href="/pricing" 
            className={clsx(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-accent hover:text-accent-foreground",
              pathname === "/pricing" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pricing</span>
          </Link>
          <Link 
            href="/settings" 
            className={clsx(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-accent hover:text-accent-foreground",
              pathname.startsWith("/settings") ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <Link 
            href="/support" 
            className={clsx(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-accent hover:text-accent-foreground",
              pathname === "/support" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Support</span>
          </Link>
          {isAdmin && (
            <Link 
              href="/admin" 
              className={clsx(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all hover:bg-accent hover:text-accent-foreground",
                pathname === "/admin" ? "bg-accent text-accent-foreground" : "text-orange-500"
              )}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold leading-none mb-1">{session.user?.name}</span>
                <span className="text-xs text-muted-foreground">{session.user?.email}</span>
              </div>
              {session.user?.image && (
                <div className="relative w-8 h-8 rounded-full border bg-accent overflow-hidden shadow-sm">
                  <img 
                    src={session.user.image} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                onClick={() => {
                  toast.promise(signOut(), {
                    loading: 'Signing out...',
                    success: 'Signed out successfully',
                    error: 'Error signing out',
                  });
                }}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}