import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, LogOut, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Denmark Restaurant" },
      { name: "description", content: "Manage orders, menu and branch details." },
      { property: "og:title", content: "Owner Dashboard — Denmark Restaurant" },
      { property: "og:description", content: "Branch owner dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OwnerPage,
});

type Branch = { id: number; name: string; address: string; phone: string; owner_id: string | null };

function OwnerPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: branches = [] } = useQuery({
    queryKey: ["owner-branches"],
    queryFn: async () => ((await supabase.from("branches").select("*").order("id")).data ?? []) as Branch[],
  });

  async function claim(id: number) {
    const { data, error } = await supabase.rpc("claim_branch", { _branch: id });
    if (error || !data) return toast.error("This branch already has an owner");
    toast.success("You are now the owner of this branch");
    qc.invalidateQueries({ queryKey: ["owner-branches"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl text-gradient-ember">DENMARK · Owner</Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{user.email}</span>
          <Button variant="secondary" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
        </div>
      </div>
      <Tabs defaultValue="1">
        <TabsList className="flex-wrap">
          {branches.map((b) => <TabsTrigger key={b.id} value={String(b.id)}>Branch {b.id}</TabsTrigger>)}
          <TabsTrigger value="account">My account</TabsTrigger>
        </TabsList>
        {branches.map((b) => (
          <TabsContent key={b.id} value={String(b.id)} className="mt-6">
            {b.owner_id === user.id ? (
              <BranchPanel branch={b} />
            ) : b.owner_id ? (
              <Locked text="This branch belongs to another owner. Only that owner can see or change it." />
            ) : (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="mb-4">{b.name} has no owner yet.</p>
                <Button onClick={() => claim(b.id)}>Become owner of Branch {b.id}</Button>
                <p className="mt-3 text-xs text-muted-foreground">Once claimed, nobody else can take over this branch.</p>
              </div>
            )}
          </TabsContent>
        ))}
        <TabsContent value="account" className="mt-6"><Account email={user.email ?? ""} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Locked({ text }: { text: string }) {
  return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">🔒 {text}</div>;
}

function BranchPanel({ branch }: { branch: Branch }) {
  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="menu">Menu</TabsTrigger>
        <TabsTrigger value="details">Branch details</TabsTrigger>
      </TabsList>
      <TabsContent value="orders" className="mt-4"><Orders branchId={branch.id} /></TabsContent>
      <TabsContent value="menu" className="mt-4"><MenuEditor branchId={branch.id} /></TabsContent>
      <TabsContent value="details" className="mt-4"><Details branch={branch} /></TabsContent>
    </Tabs>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.3, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch { /* ignore */ }
}

type OrderItem = { name: string; qty: number; subtotal: number };

function Orders({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const key = ["orders", branchId];
  const { data: orders = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("orders").select("*").eq("branch_id", branchId).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  useEffect(() => {
    const ch = supabase
      .channel(`orders-${branchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `branch_id=eq.${branchId}` }, (p) => {
        beep();
        const o = p.new as { order_no: number; customer_name: string; service_type: string };
        toast.success(`New order #${o.order_no} from ${o.customer_name} (${o.service_type === "dine_in" ? "Dine in" : "Delivery"})`, { duration: 10000 });
        qc.invalidateQueries({ queryKey: ["orders", branchId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branchId, qc]);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Bell className="h-4 w-4 text-gold" />Keep this page open — new orders appear here instantly with a sound.</p>
      {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className={`rounded-xl border bg-card p-4 ${o.status === "new" ? "border-primary shadow-glow" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">#{o.order_no} · {o.customer_name} · {o.customer_phone}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${o.service_type === "dine_in" ? "bg-secondary text-gold" : "bg-accent text-accent-foreground"}`}>
              {o.service_type === "dine_in" ? "DINE IN" : "DELIVERY"}
            </span>
          </div>
          {o.address && <p className="mt-1 text-sm text-muted-foreground">📍 {o.address}</p>}
          <ul className="mt-2 text-sm">
            {(o.items as OrderItem[]).map((i, idx) => <li key={idx}>{i.qty} × {i.name} — ₹{i.subtotal}</li>)}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-primary">Total ₹{Number(o.total).toFixed(0)} · <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span></span>
            <div className="flex gap-1">
              {["new", "preparing", "completed", "cancelled"].map((s) => (
                <Button key={s} size="sm" variant={o.status === s ? "default" : "secondary"} onClick={() => setStatus(o.id, s)} className="capitalize">{s}</Button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuEditor({ branchId }: { branchId: number }) {
  const qc = useQueryClient();
  const key = ["owner-menu", branchId];
  const { data: items = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("menu_items").select("*").eq("branch_id", branchId).order("category").order("name")).data ?? [],
  });
  const [form, setForm] = useState({ name: "", category: "Chinese", price: "", description: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || !(price >= 0)) return toast.error("Enter dish name and price");
    const { error } = await supabase.from("menu_items").insert({ branch_id: branchId, name: form.name.trim(), category: form.category.trim() || "Other", price, description: form.description.trim() });
    if (error) return toast.error(error.message);
    setForm({ ...form, name: "", price: "", description: "" });
    refresh();
  }
  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this dish?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-5">
        <Input placeholder="Dish name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
        <Input placeholder="Category" list="cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <datalist id="cats">{["Chinese", "Arabian", "Starters", "Soups", "Noodles", "Fried Rice", "Mandi", "Grills", "Shawarma", "Beverages"].map((c) => <option key={c} value={c} />)}</datalist>
        <Input placeholder="Price ₹" type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <Button>Add dish</Button>
        <Input placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sm:col-span-5" />
      </form>
      <p className="text-sm text-muted-foreground">{items.length} dishes</p>
      <div className="space-y-2">
        {items.map((m) => (
          <div key={m.id} className="grid items-center gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[2fr_1fr_100px_auto_auto]">
            <Input defaultValue={m.name} onBlur={(e) => e.target.value !== m.name && update(m.id, { name: e.target.value })} />
            <Input defaultValue={m.category} onBlur={(e) => e.target.value !== m.category && update(m.id, { category: e.target.value })} />
            <Input type="number" defaultValue={Number(m.price)} onBlur={(e) => Number(e.target.value) !== Number(m.price) && update(m.id, { price: Number(e.target.value) })} />
            <label className="flex items-center gap-2 text-xs"><Switch checked={m.available} onCheckedChange={(v) => update(m.id, { available: v })} />Available</label>
            <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Details({ branch }: { branch: Branch }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: branch.name, address: branch.address, phone: branch.phone });
  async function save() {
    const { error } = await supabase.from("branches").update(f).eq("id", branch.id);
    if (error) return toast.error(error.message);
    toast.success("Branch details saved");
    qc.invalidateQueries();
  }
  return (
    <div className="max-w-md space-y-3 rounded-xl border bg-card p-4">
      <Input placeholder="Branch name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input placeholder="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <Input placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Button onClick={save}>Save</Button>
    </div>
  );
}

function Account({ email }: { email: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error("Wrong password");
    setStep(2);
  }
  async function change() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: `${window.location.origin}/owner` });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation links sent to BOTH your old and new email. Click both to finish the change.", { duration: 10000 });
    setStep(1); setPassword(""); setNewEmail("");
  }

  return (
    <div className="max-w-md space-y-3 rounded-xl border bg-card p-4">
      <h3 className="text-lg text-gold">Change owner email</h3>
      <p className="text-sm text-muted-foreground">Current: {email}</p>
      {step === 1 ? (
        <>
          <p className="text-sm">Step 1 of 2 — confirm it's you with your password.</p>
          <Input type="password" placeholder="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button disabled={busy || !password} onClick={verify}>Verify</Button>
        </>
      ) : (
        <>
          <p className="text-sm">Step 2 of 2 — enter the new email. You'll confirm from both inboxes.</p>
          <Input type="email" placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <Button disabled={busy || !newEmail.includes("@")} onClick={change}>Send confirmation</Button>
        </>
      )}
    </div>
  );
}
