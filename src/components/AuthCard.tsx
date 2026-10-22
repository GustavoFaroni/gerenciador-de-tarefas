import type { ReactNode } from "react";
import { StickyNote } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <StickyNote size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="glass animate-pop p-6 shadow-lift">{children}</div>
      </div>
    </div>
  );
}
