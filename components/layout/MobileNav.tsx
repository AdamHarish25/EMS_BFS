"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Database, FileText } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: Activity },
  { name: 'Data', href: '/data-management', icon: Database },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-around items-center p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <item.icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]")} />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
