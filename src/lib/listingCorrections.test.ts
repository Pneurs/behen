// @ts-expect-error bun:test types are only available in the bun runtime
import { describe, expect, test } from "bun:test";
import { listingSubmissionIssue } from "./listingCorrections";
describe("own dress and correction submission rules", () => {
  test("own-media confirmation is mandatory", () => {
    expect(listingSubmissionIssue(false, null, true, true)).not.toBeNull();
    expect(listingSubmissionIssue(true, null, false, false)).toBeNull();
  });
  test("photo corrections require replacement photos", () => {
    expect(listingSubmissionIssue(true, "photos", false, true)).not.toBeNull();
    expect(listingSubmissionIssue(true, "photos", true, false)).toBeNull();
  });
  test("video corrections require replacement video", () => {
    expect(listingSubmissionIssue(true, "video", true, false)).not.toBeNull();
    expect(listingSubmissionIssue(true, "video", false, true)).toBeNull();
  });
});