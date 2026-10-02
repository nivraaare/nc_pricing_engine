import { PricingCalculation } from "./pricingTypes";

export interface CustomerQuote {
  service: string;
  duration_hours: number;
  nivraa_care_service_charge: number | null;
  care_coordination_fee: number;
  care_charge_before_credits: number | null;
  nivraa_credit_discount: number | null;
  care_charge_after_credits: number | null;
  cab_fare: number;
  transport_coordination_fee: number;
  transport_total: number;
  total_payable: number | null;
  nivraa_credits_earned: number | null;
  credit_message: string;
  pricing_status: PricingCalculation["pricingStatus"];
}

export const toCustomerQuote = (calculation: PricingCalculation): CustomerQuote => {
  let serviceCharge: number | null = null;
  let coordinationFee = calculation.careCoordinationFee;

  if (calculation.careChargeBeforeCredits !== null) {
    coordinationFee = Math.min(calculation.careCoordinationFee, calculation.careChargeBeforeCredits);
    serviceCharge = Number((calculation.careChargeBeforeCredits - coordinationFee).toFixed(2));
  }

  const creditsPer100 = Math.floor(calculation.creditEarnRate * 100);

  return {
    service: calculation.serviceName,
    duration_hours: calculation.selectedHours,
    nivraa_care_service_charge: serviceCharge,
    care_coordination_fee: coordinationFee,
    care_charge_before_credits: calculation.careChargeBeforeCredits,
    nivraa_credit_discount: calculation.creditDiscountApplied === null ? null : -calculation.creditDiscountApplied,
    care_charge_after_credits: calculation.finalCareCharge,
    cab_fare: calculation.cabFare,
    transport_coordination_fee: calculation.transportCoordinationFee,
    transport_total: calculation.transportTotal,
    total_payable: calculation.totalCustomerPayable,
    nivraa_credits_earned: calculation.nivraaCreditsEarned,
    credit_message: `Earn ${creditsPer100} NivrāaCredits per ₹100 of eligible NivrāaCare care-service spend. Credits are added after successful journey completion.`,
    pricing_status: calculation.pricingStatus
  };
};
