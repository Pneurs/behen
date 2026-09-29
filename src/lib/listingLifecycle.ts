export const LISTING_ACTIVE_DAYS = 15;

export interface LifecycleInput {
  listing_active?: boolean | null;
  activated_at?: string | null;
  created_at?: string | null;
}

export const listingDaysLeft = (product: LifecycleInput): number => {
  const start = product.activated_at || product.created_at;
  if (!start) return LISTING_ACTIVE_DAYS;
  const elapsedMs = Date.now() - new Date(start).getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return Math.max(0, LISTING_ACTIVE_DAYS - elapsedDays);
};

export const isListingActive = (product: LifecycleInput): boolean =>
  product.listing_active !== false;

export const needsSellerAction = (product: LifecycleInput): boolean =>
  !isListingActive(product) || listingDaysLeft(product) === 0;
