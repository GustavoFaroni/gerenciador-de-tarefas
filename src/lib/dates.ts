/** Datas são tratadas como "YYYY-MM-DD" no fuso local do usuário, evitando problemas de timezone. */
export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + n));
}

export function formatBR(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function longDateBR(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
