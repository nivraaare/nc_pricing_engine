import { GlobalPricingConfig, PricingSnapshot, ServiceConfig } from "./pricingTypes";
import { D, decimalNumber, moneyNumber } from "../utils/money";

export const createPricingSnapshot = (
  pricingVersion: string,
  config: GlobalPricingConfig,
  service: ServiceConfig,
  billableHours: number
): PricingSnapshot => ({
  pricingVersion,
  baseHourlyRate: moneyNumber(D(config.baseHourlyRate)),
  serviceMultiplier: decimalNumber(D(service.serviceMultiplier), 4),
  minimumBillableHours: decimalNumber(D(config.minimumBillableHours), 2),
  billableHours,
  careCoordinationFee: moneyNumber(D(config.careCoordinationFee)),
  creditEarnRate: decimalNumber(D(config.creditEarnRate), 6),
  creditValueRupees: moneyNumber(D(config.creditValueRupees)),
  maxCreditRedemptionPercentage: decimalNumber(D(config.creditMaxRedemptionPercentage), 6),
  transportCoordinationFee: moneyNumber(D(config.transportCoordinationFee))
});
