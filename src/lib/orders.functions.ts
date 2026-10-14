import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { priceOrder } from "./order-calc";

const schema = z.object({
  branchId: z.number().int().min(1).max(3),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().max(300).default(""),
  serviceType: z.enum(["dine_in", "delivery"]),
  lines: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1).max(100),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.serviceType === "delivery" && data.address.length < 5) {
      throw new Error("Please enter a delivery address");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error } = await supabaseAdmin
      .from("menu_items")
      .select("id, name, price, available")
      .eq("branch_id", data.branchId)
      .in("id", data.lines.map((l) => l.id));
    if (error) throw new Error("Could not load menu");
    const { items, total } = priceOrder(data.lines, (menu ?? []).map((m) => ({ ...m, price: Number(m.price) })));
    const { data: order, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        branch_id: data.branchId,
        customer_name: data.name,
        customer_phone: data.phone,
        address: data.serviceType === "delivery" ? data.address : "",
        service_type: data.serviceType,
        items,
        total,
      })
      .select("order_no, total")
      .single();
    if (insErr || !order) throw new Error("Could not place order");
    return { orderNo: order.order_no, total: Number(order.total) };
  });
