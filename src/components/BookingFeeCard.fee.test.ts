// @ts-expect-error bun:test types are only available in the bun runtime
import { describe, expect, test } from "bun:test";
import { bookingFeeFor } from "./BookingFeeCard";

// Each side (buyer and seller) pays: 5% on sales, 8.5% on rentals.
describe("platform fee per side", () => {
  test("sale is 5%", () => expect(bookingFeeFor(10000, "sale")).toBe(500));
  test("rental is 8.5%", () => expect(bookingFeeFor(10000, "rent")).toBe(850));
  test("rental fee rounds up to whole rupees", () => expect(bookingFeeFor(3333, "rent")).toBe(284));
});
