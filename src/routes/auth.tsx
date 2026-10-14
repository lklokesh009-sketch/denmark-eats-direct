import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Owner Sign In — Denmark Restaurant" },
      { name: "description", content: "Sign in for Denmark Restaurant branch owners." },
      { property: "og:title", content: "Owner Sign In — Denmark Restaurant" },
      { property: "og:description", content: "Branch owner access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      nav({ to: "/owner" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/owner` } });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Check your email to confirm your account, then sign in.");
      setMode("in");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8 shadow-glow">
        <Link to="/" className="block text-center font-display text-2xl text-gradient-ember">DENMARK RESTAURANT</Link>
        <h1 className="text-center text-lg">{mode === "in" ? "Owner sign in" : "Create owner account"}</h1>
        <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New branch owner? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
