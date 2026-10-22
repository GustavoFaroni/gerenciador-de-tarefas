"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };

const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-6">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto flex animate-pop items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lift backdrop-blur",
                t.kind === "success" && "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
                t.kind === "error" && "border-rose-400/30 bg-rose-500/15 text-rose-100",
                t.kind === "info" && "border-white/10 bg-white/10 text-slate-100"
              )}
            >
              <Icon size={16} />
              {t.message}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
