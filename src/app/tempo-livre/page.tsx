"use client";
import { useEffect, useMemo, useState } from "react";
import { Coins, Hourglass, Minus, Plus, Undo2, Play, Clock } from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/components/Store";
import { REDEEM_MINUTES, REDEEM_POINTS, affordableBlocks, minutesLabel } from "@/lib/points";
import type { Redemption } from "@/types";

const UNDO_MS = 10 * 60 * 1000;

function useClock(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");
function countdown(msLeft: number) {
  const s = Math.max(0, Math.round(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function TempoLivrePage() {
  const { balance, redemptions, redeem, undoRedemption, loading } = useStore();
  const now = useClock();
  const max = affordableBlocks(balance);
  const [blocks, setBlocks] = useState(1);
  const [startNow, setStartNow] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (blocks > Math.max(1, max)) setBlocks(Math.max(1, max));
  }, [max, blocks]);

  const cost = blocks * REDEEM_POINTS;
  const canRedeem = !busy && max >= 1 && blocks <= max;
  const toNext = REDEEM_POINTS - (Math.max(0, balance) % REDEEM_POINTS);

  // tempo livre em andamento (resgates com "começar agora" que ainda não acabaram)
  const active = useMemo(() => {
    if (!now) return null;
    return (
      redemptions
        .filter((r) => r.startAt)
        .map((r) => ({ r, end: new Date(r.startAt as string).getTime() + r.minutes * 60_000 }))
        .filter((x) => x.end > now)
        .sort((a, b) => b.end - a.end)[0] ?? null
    );
  }, [redemptions, now]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRedeem) return;
    setBusy(true);
    const ok = await redeem(blocks, startNow, note.trim() || undefined);
    setBusy(false);
    if (ok) {
      setNote("");
      setBlocks(1);
    }
  }

  const spentWeek = useMemo(() => {
    if (!now) return 0;
    const weekAgo = now - 7 * 86_400_000;
    return redemptions.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).reduce((s, r) => s + r.minutes, 0);
  }, [redemptions, now]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-sm text-slate-400">
          Regra: <b className="text-amber-200">{REDEEM_POINTS} pts = {REDEEM_MINUTES} min</b> de tempo livre
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Tempo livre</h1>
      </header>

      {/* saldo */}
      <section className="glass mb-5 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end" aria-labelledby="saldo-h">
        <div>
          <h2 id="saldo-h" className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
            <Coins size={14} className="text-amber-300" aria-hidden="true" /> Saldo
          </h2>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
            {loading ? "…" : balance}
            <span className="ml-1.5 text-base font-medium text-slate-400">pts</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Dá para resgatar <b className="text-white">{minutesLabel(max * REDEEM_MINUTES)}</b> de tempo livre
          </p>
        </div>
        <div className="sm:w-56">
          <div
            className="h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Progresso até os próximos 30 minutos"
            aria-valuemin={0}
            aria-valuemax={REDEEM_POINTS}
            aria-valuenow={REDEEM_POINTS - toNext}
          >
            <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${((REDEEM_POINTS - toNext) / REDEEM_POINTS) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Faltam <b className="text-amber-200">{toNext} pts</b> para mais {REDEEM_MINUTES} min
          </p>
        </div>
      </section>

      {/* em andamento */}
      {active && now && (
        <section className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5" aria-labelledby="ativo-h">
          <Hourglass size={28} className="shrink-0 text-emerald-300" aria-hidden="true" />
          <div className="flex-1">
            <h2 id="ativo-h" className="text-sm text-emerald-100">
              Tempo livre em andamento{active.r.note ? ` · ${active.r.note}` : ""}
            </h2>
            <p className="text-3xl font-semibold tabular-nums text-white" role="timer" aria-live="off">
              {countdown(active.end - now)}
            </p>
            <p className="text-xs text-emerald-200/80">
              até {new Date(active.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </section>
      )}

      {/* resgatar */}
      <form onSubmit={submit} className="glass mb-5 space-y-4 p-5" aria-labelledby="resgatar-h">
        <h2 id="resgatar-h" className="font-medium text-white">
          Resgatar
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Quanto tempo resgatar">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
              onClick={() => setBlocks((b) => Math.max(1, b - 1))}
              disabled={blocks <= 1}
              aria-label="Menos 30 minutos"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <output className="min-w-[96px] text-center" aria-live="polite">
              <span className="block text-2xl font-semibold tabular-nums text-white">{minutesLabel(blocks * REDEEM_MINUTES)}</span>
              <span className="text-xs text-amber-200">−{cost} pts</span>
            </output>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
              onClick={() => setBlocks((b) => Math.min(16, b + 1))}
              disabled={blocks >= Math.min(16, max)}
              aria-label="Mais 30 minutos"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos">
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBlocks(n)}
                disabled={n > max}
                aria-pressed={blocks === n}
                className={clsx(
                  "min-h-[36px] rounded-full border px-3 text-sm transition disabled:opacity-40",
                  blocks === n ? "border-amber-300/60 bg-amber-300/15 text-amber-100" : "border-white/15 text-slate-300 hover:bg-white/5"
                )}
              >
                {minutesLabel(n * REDEEM_MINUTES)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="tl-note">
              Para quê? (opcional)
            </label>
            <input id="tl-note" className="input" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: série, videogame, redes sociais" />
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
            Começar agora (com cronômetro)
          </label>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={!canRedeem}>
          <Play size={16} aria-hidden="true" />
          {max < 1 ? `Junte ${toNext} pts para liberar 30 min` : `Resgatar ${minutesLabel(blocks * REDEEM_MINUTES)} por ${cost} pts`}
        </button>
      </form>

      {/* histórico */}
      <section className="glass p-5" aria-labelledby="hist-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="hist-h" className="font-medium text-white">
            Histórico
          </h2>
          <span className="text-xs text-slate-400">Últimos 7 dias: {minutesLabel(spentWeek)}</span>
        </div>
        {redemptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum resgate ainda.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {redemptions.slice(0, 30).map((r) => (
              <HistoryRow key={r._id} r={r} now={now} onUndo={() => undoRedemption(r._id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ r, now, onUndo }: { r: Redemption; now: number | null; onUndo: () => void }) {
  const canUndo = now !== null && now - new Date(r.createdAt).getTime() < UNDO_MS;
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <Clock size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-slate-200">
          {minutesLabel(r.minutes)}
          {r.note ? <span className="text-slate-400"> · {r.note}</span> : null}
        </p>
        <p className="text-xs text-slate-400">{when(r.createdAt)}</p>
      </div>
      <span className="font-medium tabular-nums text-rose-300">−{r.points}</span>
      {canUndo && (
        <button type="button" onClick={onUndo} className="btn-ghost min-h-[36px] px-2 text-xs" aria-label={`Desfazer resgate de ${minutesLabel(r.minutes)}`}>
          <Undo2 size={14} aria-hidden="true" /> Desfazer
        </button>
      )}
    </li>
  );
}
