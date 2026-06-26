"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileText, Settings, ShieldAlert, Globe, Sun, Moon, Mail } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { useTutorial } from '@/contexts/TutorialContext';
import { HelpCircle } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { key: 'DashboardMenu', href: '/', icon: Activity },
  { key: 'DataManagementMenu', href: '/data-management', icon: Database },
  { key: 'ReportsMenu', href: '/reports', icon: FileText },
  { key: 'EmailAlertsMenu', href: '/emails', icon: Mail },
  { key: 'AuditLogMenu', href: '/audit-log', icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, toggleLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { startTutorial } = useTutorial();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check initial status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const checkSystemHealth = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        // Ping the backend to check if the database and API are truly alive
        const res = await fetch('/api/latest-reading?unit_id=Dispensing%201', { cache: 'no-store' });
        setIsOnline(res.ok);
      } catch (error) {
        setIsOnline(false);
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 60000); // Check every 60 seconds

    const handleOnline = () => checkSystemHealth();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to custom event from dashboard for instant sync
    const handleStatusSync = (e: any) => setIsOnline(e.detail.isOnline);
    window.addEventListener('ems-system-status', handleStatusSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('ems-system-status', handleStatusSync);
    };
  }, []);

  return (
    <div id="sidebar" className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 px-2 mb-8 text-blue-400">
        <Activity className="w-8 h-8" />
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">AHU Monitoring EMS BFS</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              id={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500")} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm font-medium">{t("Theme")}</span>
            </div>
            <span className="text-xs font-bold uppercase bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        )}

        <button
          onClick={startTutorial}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("Show Me How")}</span>
          </div>
        </button>

        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Bahasa</span>
          </div>
          <span className="text-xs font-bold uppercase bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
            {lang === 'id' ? 'ID' : 'EN'}
          </span>
        </button>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center gap-3 text-sm">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            )} />
            <span className={cn(
              "font-medium transition-colors duration-300",
              isOnline ? "text-slate-600 dark:text-slate-300" : "text-red-400"
            )}>
              {isOnline ? t("System Online") : t("System Offline")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
