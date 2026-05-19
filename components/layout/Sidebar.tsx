"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileText, Settings, ShieldAlert, Globe } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLanguage } from '@/contexts/LanguageContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { key: 'DashboardMenu', href: '/', icon: Activity },
  { key: 'DataManagementMenu', href: '/data-management', icon: Database },
  { key: 'ReportsMenu', href: '/reports', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, toggleLang, t } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 px-2 mb-8 text-blue-400">
        <Activity className="w-8 h-8" />
        <span className="text-xl font-bold text-slate-100 tracking-tight">AHU Monitoring EMS BMS</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-blue-600/10 text-blue-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500")} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Bahasa</span>
          </div>
          <span className="text-xs font-bold uppercase bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            {lang === 'id' ? 'ID' : 'EN'}
          </span>
        </button>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 transition-colors duration-300">
          <div className="flex items-center gap-3 text-sm">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            )} />
            <span className={cn(
              "font-medium transition-colors duration-300",
              isOnline ? "text-slate-300" : "text-red-400"
            )}>
              {isOnline ? t("System Online") : t("System Offline")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
