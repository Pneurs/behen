// @ts-expect-error bun:test types are only available in the bun runtime
import { describe, expect, test } from "bun:test";
import { findContactInListing, findListingContactInfo } from "./listingContactFilter";

describe("listing contact filter", () => {
  test("blocks Pakistani mobile numbers in any format", () => {
    expect(findListingContactInfo("Call 0300 1234567 for details")).toBe("phone number");
    expect(findListingContactInfo("Reach +92-321-7654321")).toBe("phone number");
    expect(findListingContactInfo("0-3-0-0-1-2-3-4-5-6-7")).toBe("phone number");
  });

  test("blocks Urdu numerals phone numbers", () => {
    expect(findListingContactInfo("۰۳۰۰۱۲۳۴۵۶۷")).toBe("phone number");
  });

  test("blocks spelled-out numbers", () => {
    expect(findListingContactInfo("zero three zero zero one two")).toBe("phone number");
  });

  test("blocks emails", () => {
    expect(findListingContactInfo("mail me sara@gmail.com")).toBe("email address");
    expect(findListingContactInfo("sara at gmail dot com")).toBe("email address");
  });

  test("blocks WhatsApp and social media mentions", () => {
    expect(findListingContactInfo("WhatsApp me for more pics")).toBe("messaging app");
    expect(findListingContactInfo("Check my insta")).toBe("social media");
    expect(findListingContactInfo("follow @sara_closet")).toBe("social media handle");
    expect(findListingContactInfo("مجھے واٹس ایپ کریں")).toBe("contact request");
  });

  test("allows normal descriptions with sizes and measurements", () => {
    expect(findListingContactInfo("Worn 2 times, chest 36, length 52 inches, 3 piece suit")).toBeNull();
    expect(findListingContactInfo("Bought in 2024 for 45000, heavy zari work")).toBeNull();
  });

  test("checks title and other public fields, not just description", () => {
    expect(findContactInListing({ title: "Red lehnga 03001234567", description: "Beautiful dress" })?.field).toBe("title");
    expect(findContactInListing({ designer: "Maria B", description: "Lovely" })).toBeNull();
  });
});
