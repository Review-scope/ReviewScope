'use client';

import Link from 'next/link';
import { 
  LayoutDashboard, 
  Book,
  LogIn, 
  LogOut, 
  HelpCircle, 
  CreditCard,
  Menu,
  X,
  Settings,
  Shield
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

// Admin GitHub IDs - must match admin/page.tsx
const ADMIN_GITHUB_IDS = ['134628559'];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // @ts-expect-error session.user.id exists
  const isAdmin = session?.user?.id && ADMIN_GITHUB_IDS.includes(session.user.id);

  // Close mobile menu on path change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/docs", label: "Docs", icon: Book },
    { href: "/pricing", label: "Pricing", icon: CreditCard },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/support", label: "Support", icon: HelpCircle },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 supports-backdrop-filter:bg-background/60 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl md:text-2xl hover:opacity-80 transition-opacity shrink-0">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo1.png" alt="ReviewScope" className="w-full h-full object-contain" />
          </div>
          <span className="tracking-tighter italic uppercase font-black">Review<span className="text-primary">Scope</span></span>
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex gap-1 md:gap-2 flex-1 ml-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={clsx(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith(link.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <link.icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link 
              href="/admin" 
              className={clsx(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all hover:bg-accent hover:text-accent-foreground",
                pathname === "/admin" ? "bg-accent text-accent-foreground" : "text-orange-500"
              )}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {session ? (
            <div className="flex items-center gap-2 md:gap-4">
              <div className="hidden sm:flex flex-col items-end mr-1">
                <span className="text-xs font-semibold leading-none mb-1 text-foreground">{session.user?.name}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-1">{session.user?.email}</span>
              </div>
              {session.user?.image && (
                <div className="relative w-8 h-8 rounded-full border bg-accent overflow-hidden shadow-sm shrink-0">
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
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-background border-b animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl overflow-hidden">
          <div className="flex flex-col p-4 gap-2">
            {!session && (
              <Link
                href="/signin"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl mb-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to ReviewScope
              </Link>
            )}
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl transition-all",
                  pathname.startsWith(link.href) ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link 
                href="/admin" 
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl border border-orange-500/20 bg-orange-500/5 transition-all text-orange-500",
                  pathname === "/admin" ? "bg-orange-500/10" : ""
                )}
              >
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
