import { describe, it, expect } from "vitest";
import { priceOrder } from "./order-calc";

const menu = [
  { id: "a", name: "Chilli Chicken", price: 180, available: true },
  { id: "b", name: "Mandi", price: 250, available: false },
];

describe("priceOrder", () => {
  it("uses the owner's price, not the customer's", () => {
    expect(priceOrder([{ id: "a", qty: 2 }], menu).total).toBe(360);
  });
  it("rejects items the owner marked unavailable", () => {
    expect(() => priceOrder([{ id: "b", qty: 1 }], menu)).toThrow();
  });
  it("rejects an empty cart", () => {
    expect(() => priceOrder([], menu)).toThrow();
  });
});
