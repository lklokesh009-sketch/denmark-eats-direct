export type PricedItem = { id: string; name: string; price: number; available: boolean };
export type CartLine = { id: string; qty: number };

/** Builds order lines and total using server-side prices only. Unknown/unavailable items are rejected. */
export function priceOrder(lines: CartLine[], menu: PricedItem[]) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  const items = lines.map((l) => {
    const m = byId.get(l.id);
    if (!m || !m.available) throw new Error("Some items are no longer available");
    const qty = Math.floor(l.qty);
    if (qty < 1 || qty > 50) throw new Error("Invalid quantity");
    return { id: m.id, name: m.name, price: Number(m.price), qty, subtotal: Number(m.price) * qty };
  });
  if (items.length === 0) throw new Error("Your cart is empty");
  const total = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  return { items, total };
}
