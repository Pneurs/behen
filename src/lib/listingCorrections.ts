export type CorrectionKind = "photos" | "video" | "contact" | "other";
export const correctionReasons: Record<CorrectionKind, string> = {
  photos: "Please replace brand/catalog images with photos you took of your actual dress.",
  video: "Please replace the advertisement or downloaded clip with a video you recorded of your actual dress.",
  contact: "Please remove phone numbers, email addresses and social handles from the listing and its images/video.",
  other: "",
};
export function listingSubmissionIssue(confirmed: boolean, kind: string | null, hasNewPhotos: boolean, hasNewVideo: boolean): string | null {
  if (!confirmed) return "Please confirm that the photos and video are of your own dress.";
  if (kind === "photos" && !hasNewPhotos) return "Please upload replacement photos of your actual dress before republishing.";
  if (kind === "video" && !hasNewVideo) return "Please upload a new video of your actual dress before republishing.";
  return null;
}