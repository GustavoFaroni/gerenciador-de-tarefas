"use client";
import Link from "next/link";
import { Target, Check, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useStore } from "./Store";
import { todayISO } from "@/lib/dates";
import { DAILY_LIMIT } from "@/types";

/** Faixa compacta com as 3 metas de hoje, exibida no topo do quadro. */
export function DailyStrip() {
  const { tasks, updateTask } = useStore();
  const today = todayISO();
  const daily = tasks.filter((t) => t.dailyDate === today);
  const slots = Array.from({ length: DAILY_LIMIT }, (_, i) => daily[i] ?? null);

  return (
    <div className="glass mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <div className="flex items-center gap-2 md:w-44">
        <Target size={18} className="text-violet-300" />
        <span className="font-medium text-white">Metas de hoje</span>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
        {slots.map((t, i) =>
          t ? (
            <button
              key={t._id}
              onClick={() => updateTask(t._id, { status: t.status === "concluida" ? "pendente" : "concluida" })}
              className={clsx(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                t.status === "concluida"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              )}
            >
              <span
                className={clsx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  t.status === "concluida" ? "border-emerald-400 bg-emerald-400 text-ink-950" : "border-slate-500"
                )}
              >
                {t.status === "concluida" && <Check size={12} strokeWidth={3} />}
              </span>
              <span className={clsx("truncate", t.status === "concluida" && "line-through opacity-70")}>{t.title}</span>
            </button>
          ) : (
            <Link
              key={`empty-${i}`}
              href="/metas-diarias"
              className="flex items-center justify-center rounded-xl border border-dashed border-white/15 px-3 py-2 text-sm text-slate-500 hover:border-violet-400/50 hover:text-violet-300"
            >
              + definir meta {i + 1}
            </Link>
          )
        )}
      </div>
      <Link href="/metas-diarias" className="hidden items-center gap-1 text-xs text-slate-400 hover:text-white md:flex">
        Gerenciar <ArrowRight size={14} />
      </Link>
    </div>
  );
}
