// @ts-expect-error bun:test types are only available in the bun runtime
import { describe, expect, test } from "bun:test";
import { bookingFeeFor } from "./BookingFeeCard";

// Launch promo: sale buyer 2.5% (was 5%), seller 5% (was 7.5%); rental buyer 4.25% (was 8.5%), seller 8.5% (was 10%).
describe("platform fee per side", () => {
  test("sale buyer pays 2.5%", () => expect(bookingFeeFor(10000, "sale", "buyer")).toBe(250));
  test("sale seller pays 5%", () => expect(bookingFeeFor(10000, "sale", "seller")).toBe(500));
  test("rental buyer pays 4.25%", () => expect(bookingFeeFor(10000, "rent", "buyer")).toBe(425));
  test("rental seller pays 8.5%", () => expect(bookingFeeFor(10000, "rent", "seller")).toBe(850));
  test("sale buyer list price is 5%", () => expect(bookingFeeFor(10000, "sale", "buyer", "list")).toBe(500));
  test("rental seller list price is 10%", () => expect(bookingFeeFor(10000, "rent", "seller", "list")).toBe(1000));
  test("rounds up to whole rupees", () => expect(bookingFeeFor(3333, "rent", "seller")).toBe(284));
});
