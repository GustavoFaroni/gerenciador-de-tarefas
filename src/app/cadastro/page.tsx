"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { UserPlus } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      return setError(body.error || "Não foi possível criar a conta.");
    }
    // já entra automaticamente
    const login = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (login?.error) return router.replace(`/login?cadastro=ok&email=${encodeURIComponent(email)}`);
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Crie sua conta" subtitle="Organize tarefas, metas e objetivos">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="label">Confirmar senha</label>
          <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          <UserPlus size={16} /> {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        Já tem conta?{" "}
        <Link href="/login" className="text-violet-300 hover:text-violet-200">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
