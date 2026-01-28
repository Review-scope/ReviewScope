'use client';

import Link from 'next/link';
import { 
  LogIn, 
  LogOut, 
  Github,
  Menu,
  X,
  Shield,
  Sparkles
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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // @ts-expect-error session.user.id exists
  const isAdmin = session?.user?.id && ADMIN_GITHUB_IDS.includes(session.user.id);

  // Close mobile menu on path change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Hide on scroll
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setIsVisible(false); // Scroll down
        } else {
          setIsVisible(true); // Scroll up
        }
        setLastScrollY(window.scrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => window.removeEventListener('scroll', controlNavbar);
    }
  }, [lastScrollY]);

  const navLinks: { href: string; label: string; icon: any }[] = [];

  return (
    <div 
      className={clsx(
        "fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none transition-transform duration-300",
        !isVisible && "-translate-y-[200%]"
      )}
    >
      <nav className="pointer-events-auto relative flex items-center justify-between gap-4 pl-2 pr-2 py-2 bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] rounded-full w-full max-w-4xl transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 pl-2 pr-4 hover:opacity-80 transition-opacity group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src="/logo1.png" alt="ReviewScope" className="relative mt-1 w-9 h-9 object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-900">
            Review<span className="text-primary">Scope</span>
          </span>
        </Link>
        
        {/* Desktop Nav Pills */}
        {(navLinks.length > 0) && (
          <div className="hidden md:flex items-center gap-1 bg-zinc-100/50 p-1 rounded-full border border-zinc-200/50">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={clsx(
                  "flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 relative overflow-hidden",
                  pathname.startsWith(link.href) 
                    ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5" 
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-white/50"
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* User Actions */}
        <div className="flex items-center gap-2 pl-2">
          {/* GitHub Link */}
          <Link
            href="https://github.com/Review-scope/ReviewScope" 
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-full border border-zinc-200 transition-all"
          >
            <Github className="w-4 h-4" />
            <span className="hidden lg:inline">Star on GitHub</span>
          </Link>

          {session ? (
            <div className="flex items-center gap-2">
               {/* User Pill */}
              <div className="flex items-center gap-2 pl-1 pr-1 py-1 bg-zinc-100/50 rounded-full border border-zinc-200/50">
                {session.user?.image ? (
                  <img 
                    src={session.user.image} 
                    alt="Avatar" 
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 text-xs font-bold ring-2 ring-white">
                    {session.user?.name?.[0] || 'U'}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-700 hidden sm:block max-w-[80px] truncate pr-1">
                  {session.user?.name?.split(' ')[0]}
                </span>
              </div>
              
              <button
                onClick={() => {
                  toast.promise(signOut(), {
                    loading: 'Signing out...',
                    success: 'Signed out successfully',
                    error: 'Error signing out',
                  });
                }}
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-full"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className="flex items-center gap-2 px-5 py-2 bg-zinc-900 text-white text-sm font-bold rounded-full hover:scale-105 hover:shadow-lg hover:shadow-zinc-900/20 transition-all active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown (Detached) */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all",
                  pathname.startsWith(link.href) 
                    ? "bg-zinc-100 text-zinc-900" 
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
            
            <Link 
              href="https://github.com/Review-scope/ReviewScope"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
            >
              <Github className="w-4 h-4" />
              <span>Star on GitHub</span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
