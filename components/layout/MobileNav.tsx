"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileText, Mail, ShieldAlert } from 'lucide-react';
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
  { key: 'EmailAlertsMenu', href: '/emails', icon: Mail },
  { key: 'AuditLogMenu', href: '/audit-log', icon: ShieldAlert },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="flex justify-around items-center p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-600 dark:text-slate-300"
            )}
          >
            <item.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]")} />
            <span className="text-[10px] font-medium text-center">{t(item.key)}</span>
          </Link>
        );
      })}
    </div>
  );
}
