"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error)
      return setError(res.error === "CredentialsSignin" ? "E-mail ou senha incorretos." : "Erro ao conectar. Tente novamente.");
    router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/");
    router.refresh();
  }

  return (
    <AuthCard title="Bem-vindo de volta" subtitle="Entre para acessar suas tarefas">
      <form onSubmit={submit} className="space-y-4">
        {params.get("cadastro") === "ok" && (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Conta criada! Agora é só entrar.
          </p>
        )}
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          <LogIn size={16} /> {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">
        Não tem conta?{" "}
        <Link href="/cadastro" className="text-violet-300 hover:text-violet-200">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
