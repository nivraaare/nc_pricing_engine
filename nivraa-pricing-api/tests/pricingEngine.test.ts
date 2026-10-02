import { describe, expect, it } from "vitest";
import { globalPricingConfig } from "../src/config/globalPricingConfig";
import { serviceByCode } from "../src/config/serviceMaster";
import { calculateQuote } from "../src/pricing/pricingEngine";

const version = "2026.10.01";
const service = (code: string) => {
  const found = serviceByCode.get(code);
  if (!found) throw new Error(`Missing service ${code}`);
  return found;
};

const quote = (overrides: Partial<Parameters<typeof calculateQuote>[0]> = {}, serviceCode = "HOSPITAL_VISIT") =>
  calculateQuote({
    serviceCode,
    selectedHours: 5,
    transportRequired: false,
    nivraaCreditDiscountRupees: 0,
    ...overrides
  }, globalPricingConfig, service(serviceCode), version);

describe("approved NivrāaCare pricing cases", () => {
  it("Case 1: Hospital Visit, 5 hours, no transport, no Credits", () => {
    const result = quote();
    expect(result.serviceTimeCharge).toBe(1495);
    expect(result.careCoordinationFee).toBe(199);
    expect(result.careChargeBeforeCredits).toBe(1694);
    expect(result.totalCustomerPayable).toBe(1694);
    expect(result.nivraaCreditsEarned).toBe(84);
  });

  it("Case 2: Hospital Visit + transport", () => {
    const result = quote({ transportRequired: true, estimatedCabFare: 500 });
    expect(result.careChargeBeforeCredits).toBe(1694);
    expect(result.transportTotal).toBe(649);
    expect(result.totalCustomerPayable).toBe(2343);
    expect(result.nivraaCreditsEarned).toBe(84);
  });

  it("Case 3: ₹20 Credit redemption + transport", () => {
    const result = quote({ transportRequired: true, estimatedCabFare: 500, nivraaCreditDiscountRupees: 20 });
    expect(result.careChargeBeforeCredits).toBe(1694);
    expect(result.creditDiscountApplied).toBe(20);
    expect(result.finalCareCharge).toBe(1674);
    expect(result.transportTotal).toBe(649);
    expect(result.totalCustomerPayable).toBe(2323);
    expect(result.rawCreditsEarned).toBe(83.7);
    expect(result.nivraaCreditsEarned).toBe(83);
    expect(result.internalCreditEconomics.creditFaceValueIssued).toBe(83);
    expect(result.internalCreditEconomics.expectedCreditRedemptionCost).toBe(58.1);
  });

  it("Case 4: Hospital-only Concierge uses 0.80 multiplier", () => {
    const result = quote({}, "HOSPITAL_ONLY");
    expect(result.effectiveHourlyRate).toBe(239.2);
    expect(result.serviceTimeCharge).toBe(1196);
    expect(result.careChargeBeforeCredits).toBe(1395);
    expect(result.nivraaCreditsEarned).toBe(69);
  });

  it("Case 5: minimum booking makes 1 selected hour bill as 2", () => {
    const result = quote({ selectedHours: 1 });
    expect(result.billableHours).toBe(2);
    expect(result.careChargeBeforeCredits).toBe(797);
    expect(result.nivraaCreditsEarned).toBe(39);
  });

  it("Case 6: ₹500 requested Credit is capped at ₹338.80", () => {
    const result = quote({ nivraaCreditDiscountRupees: 500 });
    expect(result.creditDiscountMaxAllowed).toBe(338.8);
    expect(result.creditDiscountApplied).toBe(338.8);
    expect(result.finalCareCharge).toBe(1355.2);
    expect(result.nivraaCreditsEarned).toBe(67);
    expect(result.pricingStatus).toBe("CREDIT_DISCOUNT_CAPPED");
  });

  it("Case 7: manual Overnight service requires an override", () => {
    const result = quote({ selectedHours: 8 }, "OVERNIGHT");
    expect(result.pricingStatus).toBe("MANUAL_PRICING_REQUIRED");
    expect(result.careChargeBeforeCredits).toBeNull();
    expect(result.totalCustomerPayable).toBeNull();
    expect(result.nivraaCreditsEarned).toBeNull();
  });
});

describe("edge cases and policy behavior", () => {
  it("manual service calculates after valid founder override", () => {
    const result = quote({ selectedHours: 8, priceOverrideRupees: 1800, nivraaCreditDiscountRupees: 100 }, "OVERNIGHT");
    expect(result.careChargeBeforeCredits).toBe(1800);
    expect(result.creditDiscountApplied).toBe(100);
    expect(result.finalCareCharge).toBe(1700);
    expect(result.totalCustomerPayable).toBe(1700);
    expect(result.nivraaCreditsEarned).toBe(85);
  });

  it("patient-arranged transport ignores a supplied cab estimate", () => {
    const result = quote({ transportRequired: false, estimatedCabFare: 900 });
    expect(result.cabFare).toBe(0);
    expect(result.transportCoordinationFee).toBe(0);
    expect(result.transportTotal).toBe(0);
  });

  it("Credit program disabled applies no discount and earns no Credits", () => {
    const config = { ...globalPricingConfig, creditProgramEnabled: false };
    const result = calculateQuote({
      serviceCode: "HOSPITAL_VISIT",
      selectedHours: 5,
      transportRequired: false,
      nivraaCreditDiscountRupees: 200
    }, config, service("HOSPITAL_VISIT"), version);
    expect(result.creditDiscountApplied).toBe(0);
    expect(result.finalCareCharge).toBe(1694);
    expect(result.nivraaCreditsEarned).toBe(0);
    expect(result.pricingStatus).toBe("VALID");
  });

  it("exact cap is not considered capped", () => {
    const result = quote({ nivraaCreditDiscountRupees: 338.8 });
    expect(result.creditDiscountApplied).toBe(338.8);
    expect(result.pricingStatus).toBe("VALID");
  });

  it("one paise below the cap is fully applied", () => {
    const result = quote({ nivraaCreditDiscountRupees: 338.79 });
    expect(result.creditDiscountApplied).toBe(338.79);
    expect(result.pricingStatus).toBe("VALID");
  });

  it("one paise above the cap is capped with decimal precision", () => {
    const result = quote({ nivraaCreditDiscountRupees: 338.81 });
    expect(result.creditDiscountApplied).toBe(338.8);
    expect(result.pricingStatus).toBe("CREDIT_DISCOUNT_CAPPED");
  });

  it("does not let transport increase Credit earning", () => {
    const noTransport = quote();
    const withTransport = quote({ transportRequired: true, estimatedCabFare: 500 });
    expect(withTransport.nivraaCreditsEarned).toBe(noTransport.nivraaCreditsEarned);
    expect(withTransport.eligibleCreditEarningSpend).toBe(noTransport.eligibleCreditEarningSpend);
  });

  it("uses final care after redeemed Credits as eligible earning spend", () => {
    const result = quote({ nivraaCreditDiscountRupees: 20 });
    expect(result.eligibleCreditEarningSpend).toBe(1674);
    expect(result.rawCreditsEarned).toBe(83.7);
  });

  it("keeps expected redemption rate internal and separate from customer Credits", () => {
    const result = quote();
    expect(result.nivraaCreditsEarned).toBe(84);
    expect(result.internalCreditEconomics.expectedRedemptionRate).toBe(0.7);
    expect(result.internalCreditEconomics.expectedCreditRedemptionCost).toBe(58.8);
  });
});
