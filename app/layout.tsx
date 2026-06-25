import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Providers } from "./providers";
import { Toaster } from 'sonner';
import AuditRouteListener from "@/components/AuditRouteListener";
import TutorialComponent from "@/components/TutorialComponent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Central AC Dashboard",
  description: "Real-time monitoring for Central AC systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuditRouteListener />
        <Providers>
          <AppLayout>{children}</AppLayout>
          <TutorialComponent />
          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
