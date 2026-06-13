import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Nebular Echo" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session in the URL hash on click
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (pw.length < 6) { setErr("Password must be 6+ characters"); return; }
    if (pw !== pw2) { setErr("Passwords do not match"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setInfo("Password updated. Redirecting to cockpit…");
      setTimeout(() => nav({ to: "/" }), 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Couldn't update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="flex justify-center"><Logo size={72} /></div>
        <h1 className="font-display text-2xl font-black">RESET <span className="text-gradient">ACCESS</span></h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Waiting for recovery link… Open the email link from this device.
          </p>
        ) : (
          <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-3 text-left">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg bg-secondary/40 px-4 py-3 text-sm border border-border focus:border-accent outline-none"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg bg-secondary/40 px-4 py-3 text-sm border border-border focus:border-accent outline-none"
              autoComplete="new-password"
            />
            {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
            {info && <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">{info}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 font-display text-sm font-black tracking-widest text-background disabled:opacity-60"
            >
              {busy ? "…" : "✦ UPDATE PASSWORD"}
            </button>
          </form>
        )}
        <button onClick={() => nav({ to: "/" })} className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-accent">
          ← Back to launch bay
        </button>
      </div>
    </div>
  );
}
