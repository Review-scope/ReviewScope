'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { Footer } from './footer';
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // We can sync this state later if needed

  const isLandingPage = pathname === '/';
  const isSigninPage = pathname === '/signin';

  if (isSigninPage) {
    return (
      <main className="flex-1">
        {children}
      </main>
    );
  }

  if (isLandingPage) {
    // Marketing Layout (Navbar + Footer)
    return (
      <>
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </>
    );
  }

  // Default: App Layout (Sidebar)
  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      {/* Main Content Area - adjusts margin based on sidebar state */}
      <main 
        className={clsx(
          "flex-1 transition-[padding] duration-300 w-full",
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        )}
      >
         {/* Mobile header spacer */}
         <div className="h-16 md:hidden" />
         <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
           {children}
         </div>
      </main>
    </div>
  );
}
