export const DEFAULT_PRICING_VERSION = "2026.10.01";

export const getPricingVersion = (): string =>
  process.env.PRICING_VERSION?.trim() || DEFAULT_PRICING_VERSION;
