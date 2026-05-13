"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function AuthHeader() {
  const { user, loading, configured, signInWithPassword, signUpWithPassword, signOut } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");

  const canUseAuth = configured;

  const title = useMemo(() => (mode === "sign-in" ? "登录" : "注册"), [mode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canUseAuth) return;

    setBusy(true);
    setMessage(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setMessage("请填写邮箱和密码。");
      setMessageTone("error");
      setBusy(false);
      return;
    }

    const result =
      mode === "sign-in"
        ? await signInWithPassword(trimmedEmail, trimmedPassword)
        : await signUpWithPassword(trimmedEmail, trimmedPassword);

    if (result.error) {
      setMessage(result.error);
      setMessageTone("error");
    } else if (mode === "sign-up") {
      setMessage("注册成功：若项目开启了邮箱验证，请先去邮箱点确认链接再登录。");
      setMessageTone("success");
    } else {
      setMessage(null);
      setPassword("");
    }

    setBusy(false);
  };

  if (!configured) {
    return (
      <div className="max-w-[220px] text-right text-[11px] leading-snug text-muted-foreground">
        云端未配置：请在 `.env.local` 写入 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      </div>
    );
  }

  if (loading) {
    return <div className="text-xs text-muted-foreground">正在检查登录状态...</div>;
  }

  if (user) {
    return (
      <div className="flex max-w-[260px] flex-col items-end gap-1 text-right">
        <span className="truncate text-xs text-foreground">{user.email}</span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full border border-border/80 bg-card px-3 py-1 text-[11px] text-muted-foreground transition hover:border-accent/55 hover:text-foreground"
        >
          退出登录
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-[min(92vw,260px)] flex-col items-end gap-2 rounded-2xl border border-border/80 bg-card/80 p-3 text-right shadow-sm supports-[backdrop-filter]:backdrop-blur-sm"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <button
          type="button"
          className="text-[11px] text-muted-foreground underline underline-offset-4"
          onClick={() => {
            setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"));
            setMessage(null);
          }}
        >
          {mode === "sign-in" ? "没有账号？注册" : "已有账号？登录"}
        </button>
      </div>

      <label className="block w-full text-left">
        <span className="text-[11px] text-muted-foreground">邮箱</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none transition focus:border-accent/70"
        />
      </label>

      <label className="block w-full text-left">
        <span className="text-[11px] text-muted-foreground">密码</span>
        <input
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none transition focus:border-accent/70"
        />
      </label>

      {message ? (
        <p
          className={`w-full text-left text-[11px] ${
            messageTone === "success"
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-rose-600 dark:text-rose-300"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="h-9 w-full rounded-xl bg-foreground text-background text-xs font-medium disabled:opacity-60"
      >
        {busy ? "处理中..." : mode === "sign-in" ? "登录" : "注册"}
      </button>
    </form>
  );
}
