import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "./Logo";

type Mode = "signin" | "signup";

export function AuthScreen({ onAuthed }: { onAuthed: (username: string) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
    if (password.length < 6) return "Password must be 6+ characters";
    if (mode === "signup") {
      if (!/^[A-Za-z0-9_]{3,16}$/.test(username))
        return "Username: 3-16 letters / numbers / _";
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setInfo(null);
    const v = validate(); if (v) { setErr(v); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { username: username.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) onAuthed(username.trim());
        else setInfo("Check your inbox to verify your email, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: prof } = await supabase
          .from("profiles").select("username").eq("id", data.user!.id).maybeSingle();
        onAuthed((prof?.username ?? email.split("@")[0]).toUpperCase().slice(0, 10));
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) setErr(result.error.message || "Google sign-in failed");
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in unavailable");
    }
  };

  const sendReset = async () => {
    setErr(null); setInfo(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setErr("Enter a valid email"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo("Recovery link sent. Check your inbox.");
      setForgotOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-md flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <Logo size={88} />
      <h1 className="font-display text-3xl font-black leading-none">
        NEBULAR <span className="text-gradient">ECHO</span>
      </h1>
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        {mode === "signin" ? "Pilot Sign-In" : "Enlist New Pilot"}
      </p>

      <form onSubmit={submit} className="w-full glass rounded-2xl p-5 text-left space-y-3">
        {mode === "signup" && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg bg-secondary/40 px-4 py-3 text-sm outline-none border border-border focus:border-accent"
            placeholder="Pilot username"
            autoComplete="username"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-secondary/40 px-4 py-3 text-sm outline-none border border-border focus:border-accent"
          placeholder="Email"
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-secondary/40 px-4 py-3 text-sm outline-none border border-border focus:border-accent"
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
        {info && <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">{info}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 font-display text-sm font-black tracking-widest text-background neon-glow transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "▶ ENTER COCKPIT" : "✦ ENLIST"}
        </button>

        <button
          type="button"
          onClick={google}
          className="w-full rounded-full border border-border bg-secondary/40 px-6 py-3 text-xs uppercase tracking-widest text-foreground hover:border-accent"
        >
          Continue with Google
        </button>

        {mode === "signin" && !forgotOpen && (
          <button
            type="button"
            onClick={() => { setForgotOpen(true); setForgotEmail(email); setErr(null); setInfo(null); }}
            className="w-full text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent"
          >
            Forgot password?
          </button>
        )}

        {forgotOpen && (
          <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
            <p className="text-[10px] uppercase tracking-widest text-accent">Recover Pilot Access</p>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full rounded-lg bg-secondary/40 px-3 py-2 text-sm outline-none border border-border focus:border-accent"
              placeholder="Email for recovery link"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendReset}
                disabled={busy}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-widest text-background disabled:opacity-60"
              >
                Send Link
              </button>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); setInfo(null); }}
        className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent"
      >
        {mode === "signin" ? "New pilot? Enlist →" : "← Already a pilot? Sign in"}
      </button>

      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Email verified · Secure session · Your runs save to the cloud
      </p>
    </div>
  );
}