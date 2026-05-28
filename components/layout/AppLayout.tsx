import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 border-r border-slate-200 dark:border-slate-800/60 bg-white/95 dark:bg-[#0a0f1c]/95 backdrop-blur-2xl z-50">
        <div className="h-screen sticky top-0">
          <Sidebar />
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden bg-slate-50 dark:bg-gradient-to-br dark:from-[#0a0f1c] dark:via-[#0f172a] dark:to-[#0a0f1c] relative">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />
        
        <div className="flex-1 overflow-auto w-full pb-20 md:pb-0 relative z-10">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0a0f1c]/80 backdrop-blur-xl z-50">
        <MobileNav />
      </div>
    </div>
  );
}
