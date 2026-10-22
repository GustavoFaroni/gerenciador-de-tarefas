"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Flag, Plus, StickyNote, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import clsx from "clsx";
import { useTaskModal } from "./TaskModal";
import { useStore } from "./Store";
import { todayISO } from "@/lib/dates";
import { DAILY_LIMIT } from "@/types";

const NAV = [
  { href: "/", label: "Quadro", icon: LayoutDashboard },
  { href: "/metas-diarias", label: "Metas do dia", icon: Target },
  { href: "/objetivos", label: "Objetivos", icon: Flag },
];

export function Sidebar() {
  const path = usePathname();
  const { open } = useTaskModal();
  const { tasks } = useStore();
  const { data: session } = useSession();
  const user = session?.user;
  const today = todayISO();
  const daily = tasks.filter((t) => t.dailyDate === today);
  const dailyDone = daily.filter((t) => t.status === "concluida").length;

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/40 p-5 backdrop-blur-xl md:flex">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
            <StickyNote size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Gerenciador</p>
            <p className="text-xs text-slate-400">de Tarefas</p>
          </div>
        </div>

        <button onClick={() => open()} className="btn-primary mb-6 w-full">
          <Plus size={16} /> Nova tarefa
        </button>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                path === href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="glass mt-auto p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Metas de hoje</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {dailyDone}
            <span className="text-base text-slate-500">/{DAILY_LIMIT}</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
              <span
                key={i}
                className={clsx(
                  "h-1.5 flex-1 rounded-full",
                  i < dailyDone ? "bg-emerald-400" : i < daily.length ? "bg-violet-400/60" : "bg-white/10"
                )}
              />
            ))}
          </div>
        </div>

        {user && (
          <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/20 text-sm font-semibold uppercase text-violet-200">
              {user.name?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 bg-ink-900/90 py-2 backdrop-blur-xl md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx("flex flex-col items-center gap-0.5 px-3 text-[11px]", path === href ? "text-violet-300" : "text-slate-400")}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex flex-col items-center gap-0.5 px-3 text-[11px] text-slate-400">
          <LogOut size={20} />
          Sair
        </button>
        <button onClick={() => open()} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
          <Plus size={20} />
        </button>
      </nav>
    </>
  );
}
