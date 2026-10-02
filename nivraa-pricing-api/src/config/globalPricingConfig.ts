import { GlobalPricingConfig } from "../pricing/pricingTypes";

export const globalPricingConfig: GlobalPricingConfig = Object.freeze({
  baseHourlyRate: "299",
  minimumBillableHours: "2",
  careCoordinationFee: "199",
  careGstRate: "0.18",
  transportCoordinationFee: "149",
  defaultCabEstimate: "500",
  creditProgramEnabled: true,
  creditEarnRate: "0.05",
  creditValueRupees: "1",
  creditMaxRedemptionPercentage: "0.20",
  creditExpiryDays: 180,
  creditExpectedRedemptionRate: "0.70"
});
