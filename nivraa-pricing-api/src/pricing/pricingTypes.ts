export type PricingMode = "AUTO" | "MANUAL";
export type PricingStatus = "VALID" | "CREDIT_DISCOUNT_CAPPED" | "MANUAL_PRICING_REQUIRED";

export interface GlobalPricingConfig {
  baseHourlyRate: string;
  minimumBillableHours: string;
  careCoordinationFee: string;
  careGstRate: string;
  transportCoordinationFee: string;
  defaultCabEstimate: string;
  creditProgramEnabled: boolean;
  creditEarnRate: string;
  creditValueRupees: string;
  creditMaxRedemptionPercentage: string;
  creditExpiryDays: number;
  creditExpectedRedemptionRate: string;
}

export interface ServiceConfig {
  serviceCode: string;
  serviceName: string;
  category: string;
  serviceMultiplier: string;
  pricingMode: PricingMode;
  numberOfAngels: number;
  active: boolean;
  multiplierReason: string;
}

export interface QuoteInput {
  serviceCode: string;
  selectedHours: number;
  transportRequired: boolean;
  estimatedCabFare?: number;
  nivraaCreditDiscountRupees: number;
  priceOverrideRupees?: number;
  overrideReason?: string;
  overrideAuthorized?: boolean;
}

export interface PricingSnapshot {
  pricingVersion: string;
  baseHourlyRate: number;
  serviceMultiplier: number;
  minimumBillableHours: number;
  billableHours: number;
  careCoordinationFee: number;
  creditEarnRate: number;
  creditValueRupees: number;
  maxCreditRedemptionPercentage: number;
  transportCoordinationFee: number;
}

export interface InternalPricingTrace {
  selectedHours: number;
  minimumBooking: number;
  billableHours: number;
  baseHourlyRate: number;
  serviceMultiplier: number;
  effectiveHourlyRate: number | null;
  serviceTimeCharge: number | null;
  careCoordinationFee: number;
  standardCalculatedCarePrice: number | null;
  careChargeBeforeCredits: number | null;
  requestedCreditDiscount: number;
  maximumCreditDiscount: number | null;
  appliedCreditDiscount: number | null;
  finalCareCharge: number | null;
  transportTotal: number;
  totalPayable: number | null;
  creditsEarned: number | null;
  serviceCode: string;
  pricingMode: PricingMode;
  pricingVersion: string;
  pricingStatus: PricingStatus;
}

export interface InternalCreditEconomics {
  creditFaceValueIssued: number | null;
  expectedCreditRedemptionCost: number | null;
  expectedRedemptionRate: number;
}

export interface PricingCalculation {
  pricingStatus: PricingStatus;
  serviceCode: string;
  serviceName: string;
  selectedHours: number;
  billableHours: number;
  effectiveHourlyRate: number | null;
  serviceTimeCharge: number | null;
  careCoordinationFee: number;
  careChargeBeforeCredits: number | null;
  creditProgramEnabled: boolean;
  creditDiscountRequested: number;
  creditDiscountMaxAllowed: number | null;
  creditDiscountApplied: number | null;
  finalCareCharge: number | null;
  cabFare: number;
  transportCoordinationFee: number;
  transportTotal: number;
  totalCustomerPayable: number | null;
  eligibleCreditEarningSpend: number | null;
  creditEarnRate: number;
  creditValueRupees: number;
  rawCreditsEarned: number | null;
  nivraaCreditsEarned: number | null;
  creditExpiryDays: number;
  pricingSnapshot: PricingSnapshot;
  internalTrace: InternalPricingTrace;
  internalCreditEconomics: InternalCreditEconomics;
}
