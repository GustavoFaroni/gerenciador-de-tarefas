"use client";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ToastProvider } from "./Toast";
import { StoreProvider } from "./Store";
import { TaskModalProvider } from "./TaskModal";
import { Sidebar } from "./Sidebar";

const PUBLIC_ROUTES = ["/login", "/cadastro"];

export function Providers({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(path);

  return (
    <SessionProvider>
      <ToastProvider>
        {isPublic ? (
          children
        ) : (
          <StoreProvider>
            <TaskModalProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
              </div>
            </TaskModalProvider>
          </StoreProvider>
        )}
      </ToastProvider>
    </SessionProvider>
  );
}
