"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileText, Settings, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: Activity },
  { name: 'Data Management', href: '/data-management', icon: Database },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 px-2 mb-8 text-blue-400">
        <Activity className="w-8 h-8" />
        <span className="text-xl font-bold text-slate-100 tracking-tight">AC Monitor</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 font-medium" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-slate-300 font-medium">System Online</span>
        </div>
      </div>
    </div>
  );
}
