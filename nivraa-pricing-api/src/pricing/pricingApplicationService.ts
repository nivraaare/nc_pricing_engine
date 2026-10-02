import { randomUUID } from "node:crypto";
import { PricingConfigRepository } from "../repositories/PricingConfigRepository";
import { getPricingVersion } from "../config/pricingVersion";
import { calculateQuote } from "./pricingEngine";
import { QuoteInput } from "./pricingTypes";
import { toCustomerQuote } from "./customerQuote";

export class PricingApplicationService {
  constructor(private readonly repository: PricingConfigRepository) {}

  quote(input: QuoteInput, requestId: string) {
    const service = this.repository.getService(input.serviceCode);
    if (!service || !service.active) {
      const error = new Error("INVALID_SERVICE_CODE");
      throw error;
    }

    const config = this.repository.getGlobalConfig();
    const pricingVersion = getPricingVersion();
    const calculation = calculateQuote(input, config, service, pricingVersion);
    const quoteId = randomUUID();
    const calculatedAt = new Date().toISOString();

    const response = {
      quote_id: quoteId,
      request_id: requestId,
      calculated_at: calculatedAt,
      pricing_version: pricingVersion,
      service_code: calculation.serviceCode,
      service_name: calculation.serviceName,
      selected_hours: calculation.selectedHours,
      billable_hours: calculation.billableHours,
      effective_hourly_rate: calculation.effectiveHourlyRate,
      service_time_charge: calculation.serviceTimeCharge,
      care_coordination_fee: calculation.careCoordinationFee,
      care_charge_before_credits: calculation.careChargeBeforeCredits,
      credit_program_enabled: calculation.creditProgramEnabled,
      credit_discount_requested: calculation.creditDiscountRequested,
      credit_discount_max_allowed: calculation.creditDiscountMaxAllowed,
      credit_discount_applied: calculation.creditDiscountApplied,
      final_care_charge: calculation.finalCareCharge,
      cab_fare: calculation.cabFare,
      transport_coordination_fee: calculation.transportCoordinationFee,
      transport_total: calculation.transportTotal,
      total_customer_payable: calculation.totalCustomerPayable,
      eligible_credit_earning_spend: calculation.eligibleCreditEarningSpend,
      credit_earn_rate: calculation.creditEarnRate,
      credit_value_rupees: calculation.creditValueRupees,
      raw_credits_earned: calculation.rawCreditsEarned,
      nivraa_credits_earned: calculation.nivraaCreditsEarned,
      credit_expiry_days: calculation.creditExpiryDays,
      pricing_status: calculation.pricingStatus,
      customer_quote: toCustomerQuote(calculation),
      pricing_snapshot: {
        pricing_version: calculation.pricingSnapshot.pricingVersion,
        base_hourly_rate: calculation.pricingSnapshot.baseHourlyRate,
        service_multiplier: calculation.pricingSnapshot.serviceMultiplier,
        minimum_billable_hours: calculation.pricingSnapshot.minimumBillableHours,
        billable_hours: calculation.pricingSnapshot.billableHours,
        care_coordination_fee: calculation.pricingSnapshot.careCoordinationFee,
        credit_earn_rate: calculation.pricingSnapshot.creditEarnRate,
        credit_value_rupees: calculation.pricingSnapshot.creditValueRupees,
        max_credit_redemption_percentage: calculation.pricingSnapshot.maxCreditRedemptionPercentage,
        transport_coordination_fee: calculation.pricingSnapshot.transportCoordinationFee
      }
    };

    return { response, calculation };
  }
}
