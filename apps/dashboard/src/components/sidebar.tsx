'use client';

import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Shield, 
  Menu, 
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  CreditCard,
  LifeBuoy,
  Heart,
  MailQuestion,
  Book
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'sonner';

// Admin GitHub IDs - must match admin/page.tsx
const ADMIN_GITHUB_IDS = ['134628559'];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // @ts-expect-error session.user.id exists
  const isAdmin = session?.user?.id && ADMIN_GITHUB_IDS.includes(session.user.id);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/docs", label: "Docs", icon: Book },
    { href: "/pricing", label: "Pricing", icon: CreditCard },
    { href: "/support", label: "Support", icon: MailQuestion },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/sponsors", label: "Sponsors", icon: Heart },
  ];

  if (isAdmin) {
    links.push({ href: "/admin", label: "Admin", icon: Shield });
  }

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-white rounded-lg shadow-md border border-zinc-200 text-zinc-600"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Container */}
      <aside 
        className={clsx(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo1.png" alt="ReviewScope" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg tracking-tight text-zinc-900">
                Review<span className="text-primary">Scope</span>
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/" className="mx-auto">
              <img src="/logo1.png" alt="ReviewScope" className="w-8 h-8 object-contain" />
            </Link>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group relative",
                pathname.startsWith(link.href)
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? link.label : undefined}
            >
              <link.icon className={clsx("w-5 h-5 shrink-0", !pathname.startsWith(link.href) && "group-hover:scale-110 transition-transform")} />
              {!isCollapsed && <span>{link.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {link.label}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50">
          {session ? (
            <div className={clsx("flex items-center gap-3", isCollapsed && "justify-center")}>
              {session.user?.image ? (
                <img 
                  src={session.user.image} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center ring-2 ring-white">
                   <User className="w-5 h-5 text-zinc-500" />
                </div>
              )}
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">
                    {session.user?.name}
                  </p>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-zinc-500 hover:text-red-600 flex items-center gap-1 transition-colors mt-0.5"
                  >
                    <LogOut className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
             <Link
              href="/signin"
              className={clsx(
                "flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors",
                isCollapsed && "justify-center px-2"
              )}
            >
              <LogIn className="w-4 h-4" />
              {!isCollapsed && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}

function LogIn(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  )
}
