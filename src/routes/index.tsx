import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag, UtensilsCrossed, Bike, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { placeOrder } from "@/lib/orders.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import hero from "@/assets/hero.jpg";
import chinese from "@/assets/chinese.jpg";
import arabian from "@/assets/arabian.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Denmark Restaurant — Chinese & Arabian Non-Veg, Coimbatore" },
      { name: "description", content: "Order authentic Chinese and Arabian non-veg dishes from Denmark Restaurant — VOC Park, RS Puram and Ganapathy." },
      { property: "og:title", content: "Denmark Restaurant — Order Online" },
      { property: "og:description", content: "Authentic Chinese & Arabian non-veg food. Dine in or delivery." },
    ],
  }),
  component: Index,
});

type MenuItem = { id: string; name: string; category: string; price: number; description: string; available: boolean };

function Index() {
  const [branchId, setBranchId] = useState(1);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await supabase.from("branches").select("id, name, address, phone").order("id")).data ?? [],
  });
  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["menu", branchId],
    queryFn: async () =>
      ((await supabase.from("menu_items").select("id, name, category, price, description, available").eq("branch_id", branchId).eq("available", true).order("category").order("name")).data ?? []) as MenuItem[],
  });

  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {};
    menu.forEach((m) => (g[m.category] ??= []).push(m));
    return g;
  }, [menu]);

  const lines = menu.filter((m) => cart[m.id]);
  const total = lines.reduce((s, m) => s + Number(m.price) * cart[m.id], 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const change = (id: string, d: number) =>
    setCart((c) => {
      const n = Math.max(0, (c[id] ?? 0) + d);
      const next = { ...c, [id]: n };
      if (!n) delete next[id];
      return next;
    });

  const branch = branches.find((b) => b.id === branchId);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative h-[92vh] min-h-[560px] overflow-hidden">
        <img src={hero} alt="Arabian mandi, shawarma and Chinese dragon chicken" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover animate-kenburns" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/50 to-background" />
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="ember-particle" style={{ left: `${(i * 53) % 100}%`, animationDuration: `${6 + (i % 5) * 2}s`, animationDelay: `${i * 0.6}s` }} />
        ))}
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <span className="font-display text-lg tracking-widest text-gold">DENMARK</span>
          <Link to="/owner" className="text-sm text-muted-foreground hover:text-foreground">Owner</Link>
        </nav>
        <div className="relative z-10 mx-auto flex h-[70%] max-w-6xl flex-col items-center justify-center px-5 text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.4em] text-gold">Authentic Non-Veg · Chinese & Arabian</p>
          <h1 className="text-5xl font-extrabold leading-tight text-gradient-ember sm:text-7xl md:text-8xl">DENMARK<br />RESTAURANT</h1>
          <p className="mt-6 max-w-xl text-lg text-foreground/80">From the wok's fire to the Arabian grill — served across Coimbatore, Tamil Nadu.</p>
          <Button size="lg" className="mt-8 bg-gradient-ember text-primary-foreground shadow-glow" onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}>
            Order Now
          </Button>
        </div>
      </header>

      {/* Cuisine showcase */}
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
        {[{ img: chinese, t: "Chinese Fire", d: "Dragon chicken, chilli prawns, schezwan noodles." }, { img: arabian, t: "Arabian Grill", d: "Mandi, alfaham, shawarma and kebabs." }].map((c, i) => (
          <div key={c.t} className="animate-float3d overflow-hidden rounded-2xl border bg-card shadow-glow" style={{ animationDelay: `${i * 1.5}s` }}>
            <img src={c.img} alt={c.t} loading="lazy" width={1024} height={768} className="h-64 w-full object-cover" />
            <div className="p-6">
              <h3 className="text-2xl text-gold">{c.t}</h3>
              <p className="mt-2 text-muted-foreground">{c.d}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Branch picker */}
      <section id="menu" className="mx-auto max-w-6xl px-5 pb-32">
        <h2 className="text-center text-4xl text-gradient-ember">Our Menu</h2>
        <p className="mt-2 text-center text-muted-foreground">Choose your branch</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => { setBranchId(b.id); setCart({}); }}
              className={`rounded-xl border p-4 text-left transition ${b.id === branchId ? "border-primary bg-secondary shadow-glow" : "bg-card hover:border-primary/50"}`}
            >
              <div className="font-semibold">{b.name}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{b.address}</div>
              {b.phone && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{b.phone}</div>}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-12 text-center text-muted-foreground">Loading menu…</p>
        ) : menu.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">The menu for this branch is coming soon.</p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mt-12">
              <h3 className="mb-4 border-b pb-2 text-2xl text-gold">{cat}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                    <div className="min-w-0">
                      <div className="font-semibold">{m.name}</div>
                      {m.description && <div className="truncate text-xs text-muted-foreground">{m.description}</div>}
                      <div className="mt-1 font-semibold text-primary">₹{Number(m.price).toFixed(0)}</div>
                    </div>
                    {cart[m.id] ? (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => change(m.id, -1)}><Minus className="h-4 w-4" /></Button>
                        <span className="w-5 text-center">{cart[m.id]}</span>
                        <Button size="icon" className="h-8 w-8" onClick={() => change(m.id, 1)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => change(m.id, 1)}>Add</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <Button size="lg" className="w-full max-w-md bg-gradient-ember text-primary-foreground shadow-glow" onClick={() => setOpen(true)}>
            <ShoppingBag className="mr-2 h-5 w-5" /> {count} item{count > 1 ? "s" : ""} · ₹{total.toFixed(0)} — Checkout
          </Button>
        </div>
      )}

      <Checkout
        open={open}
        onOpenChange={setOpen}
        branchId={branchId}
        branchName={branch?.name ?? ""}
        lines={lines.map((m) => ({ ...m, qty: cart[m.id] }))}
        total={total}
        onDone={() => { setCart({}); setOpen(false); }}
      />
    </div>
  );
}

function Checkout(props: {
  open: boolean; onOpenChange: (o: boolean) => void; branchId: number; branchName: string;
  lines: (MenuItem & { qty: number })[]; total: number; onDone: () => void;
}) {
  const submit = useServerFn(placeOrder);
  const [mode, setMode] = useState<"dine_in" | "delivery" | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!mode) return toast.error("Choose Dine In or Delivery");
    if (!name.trim() || phone.trim().length < 6) return toast.error("Enter your name and phone number");
    if (mode === "delivery" && address.trim().length < 5) return toast.error("Enter your delivery address");
    setBusy(true);
    try {
      const r = await submit({ data: { branchId: props.branchId, name, phone, address, serviceType: mode, lines: props.lines.map((l) => ({ id: l.id, qty: l.qty })) } });
      toast.success(`Order #${r.orderNo} placed! Total ₹${r.total.toFixed(0)}. The restaurant has been notified.`, { duration: 8000 });
      props.onDone();
      setMode(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle className="font-display text-gold">Your Order</SheetTitle></SheetHeader>
        <p className="px-4 text-xs text-muted-foreground">{props.branchName}</p>
        <div className="space-y-2 p-4">
          {props.lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm">
              <span>{l.qty} × {l.name}</span><span>₹{(Number(l.price) * l.qty).toFixed(0)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-lg font-semibold">
            <span>Total</span><span className="text-primary">₹{props.total.toFixed(0)}</span>
          </div>
        </div>
        <div className="space-y-3 px-4">
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setMode("dine_in")} className={`flex flex-col items-center gap-2 rounded-xl border p-4 font-semibold ${mode === "dine_in" ? "border-primary bg-secondary shadow-glow" : ""}`}>
              <UtensilsCrossed className="h-6 w-6 text-gold" /> DINE IN
            </button>
            <button onClick={() => setMode("delivery")} className={`flex flex-col items-center gap-2 rounded-xl border p-4 font-semibold ${mode === "delivery" ? "border-primary bg-secondary shadow-glow" : ""}`}>
              <Bike className="h-6 w-6 text-gold" /> DELIVERY
            </button>
          </div>
          {mode === "delivery" && <Textarea placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />}
          <Button className="w-full bg-gradient-ember text-primary-foreground" size="lg" disabled={busy || !props.lines.length} onClick={go}>
            {busy ? "Placing order…" : "Place Order"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
