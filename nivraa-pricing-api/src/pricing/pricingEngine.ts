import Decimal from "decimal.js";
import { calculateCredits } from "./creditEngine";
import { calculateTransport } from "./transportEngine";
import { createPricingSnapshot } from "./pricingSnapshot";
import { GlobalPricingConfig, PricingCalculation, PricingStatus, QuoteInput, ServiceConfig } from "./pricingTypes";
import { D, decimalNumber, moneyNumber } from "../utils/money";

const toNullableMoney = (value: Decimal | null): number | null => value === null ? null : moneyNumber(value);
const toNullableDecimal = (value: Decimal | null, places = 4): number | null => value === null ? null : decimalNumber(value, places);

export const calculateQuote = (
  input: QuoteInput,
  config: GlobalPricingConfig,
  service: ServiceConfig,
  pricingVersion: string
): PricingCalculation => {
  const selectedHours = D(input.selectedHours);
  const minimumHours = D(config.minimumBillableHours);
  const billableHoursDecimal = Decimal.max(selectedHours, minimumHours);
  const billableHours = decimalNumber(billableHoursDecimal, 2);

  const baseHourlyRate = D(config.baseHourlyRate);
  const multiplier = D(service.serviceMultiplier);
  const careCoordinationFee = D(config.careCoordinationFee);
  const requestedCredit = D(input.nivraaCreditDiscountRupees ?? 0);

  const transport = calculateTransport(
    input.transportRequired,
    input.estimatedCabFare,
    config.transportCoordinationFee
  );

  const isManualWithoutOverride = service.pricingMode === "MANUAL" && input.priceOverrideRupees === undefined;

  let effectiveHourlyRate: Decimal | null = null;
  let serviceTimeCharge: Decimal | null = null;
  let standardCareCharge: Decimal | null = null;
  let careChargeBeforeCredits: Decimal | null = null;

  if (!isManualWithoutOverride || service.pricingMode === "AUTO") {
    effectiveHourlyRate = baseHourlyRate.mul(multiplier);
    serviceTimeCharge = billableHoursDecimal.mul(effectiveHourlyRate);
    standardCareCharge = serviceTimeCharge.plus(careCoordinationFee);
  }

  if (input.priceOverrideRupees !== undefined) {
    careChargeBeforeCredits = D(input.priceOverrideRupees);
  } else if (service.pricingMode === "AUTO") {
    careChargeBeforeCredits = standardCareCharge;
  }

  const pricingSnapshot = createPricingSnapshot(pricingVersion, config, service, billableHours);

  if (careChargeBeforeCredits === null) {
    const status: PricingStatus = "MANUAL_PRICING_REQUIRED";
    return {
      pricingStatus: status,
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      selectedHours: input.selectedHours,
      billableHours,
      effectiveHourlyRate: null,
      serviceTimeCharge: null,
      careCoordinationFee: moneyNumber(careCoordinationFee),
      careChargeBeforeCredits: null,
      creditProgramEnabled: config.creditProgramEnabled,
      creditDiscountRequested: moneyNumber(requestedCredit),
      creditDiscountMaxAllowed: null,
      creditDiscountApplied: null,
      finalCareCharge: null,
      cabFare: moneyNumber(transport.cabFare),
      transportCoordinationFee: moneyNumber(transport.coordinationFee),
      transportTotal: moneyNumber(transport.total),
      totalCustomerPayable: null,
      eligibleCreditEarningSpend: null,
      creditEarnRate: decimalNumber(D(config.creditEarnRate), 6),
      creditValueRupees: moneyNumber(D(config.creditValueRupees)),
      rawCreditsEarned: null,
      nivraaCreditsEarned: null,
      creditExpiryDays: config.creditExpiryDays,
      pricingSnapshot,
      internalTrace: {
        selectedHours: input.selectedHours,
        minimumBooking: decimalNumber(minimumHours, 2),
        billableHours,
        baseHourlyRate: moneyNumber(baseHourlyRate),
        serviceMultiplier: decimalNumber(multiplier, 4),
        effectiveHourlyRate: null,
        serviceTimeCharge: null,
        careCoordinationFee: moneyNumber(careCoordinationFee),
        standardCalculatedCarePrice: null,
        careChargeBeforeCredits: null,
        requestedCreditDiscount: moneyNumber(requestedCredit),
        maximumCreditDiscount: null,
        appliedCreditDiscount: null,
        finalCareCharge: null,
        transportTotal: moneyNumber(transport.total),
        totalPayable: null,
        creditsEarned: null,
        serviceCode: service.serviceCode,
        pricingMode: service.pricingMode,
        pricingVersion,
        pricingStatus: status
      },
      internalCreditEconomics: {
        creditFaceValueIssued: null,
        expectedCreditRedemptionCost: null,
        expectedRedemptionRate: decimalNumber(D(config.creditExpectedRedemptionRate), 6)
      }
    };
  }

  const credit = calculateCredits(careChargeBeforeCredits, requestedCredit, {
    enabled: config.creditProgramEnabled,
    earnRate: config.creditEarnRate,
    valueRupees: config.creditValueRupees,
    maxRedemptionPercentage: config.creditMaxRedemptionPercentage,
    expiryDays: config.creditExpiryDays,
    expectedRedemptionRate: config.creditExpectedRedemptionRate
  });

  const finalCareCharge = credit.eligibleEarningSpend;
  const total = finalCareCharge.plus(transport.total);

  let status: PricingStatus = "VALID";
  if (config.creditProgramEnabled && requestedCredit.greaterThan(credit.applied)) {
    status = "CREDIT_DISCOUNT_CAPPED";
  }

  return {
    pricingStatus: status,
    serviceCode: service.serviceCode,
    serviceName: service.serviceName,
    selectedHours: input.selectedHours,
    billableHours,
    effectiveHourlyRate: toNullableMoney(effectiveHourlyRate),
    serviceTimeCharge: toNullableMoney(serviceTimeCharge),
    careCoordinationFee: moneyNumber(careCoordinationFee),
    careChargeBeforeCredits: moneyNumber(careChargeBeforeCredits),
    creditProgramEnabled: config.creditProgramEnabled,
    creditDiscountRequested: moneyNumber(requestedCredit),
    creditDiscountMaxAllowed: moneyNumber(credit.maxAllowed),
    creditDiscountApplied: moneyNumber(credit.applied),
    finalCareCharge: moneyNumber(finalCareCharge),
    cabFare: moneyNumber(transport.cabFare),
    transportCoordinationFee: moneyNumber(transport.coordinationFee),
    transportTotal: moneyNumber(transport.total),
    totalCustomerPayable: moneyNumber(total),
    eligibleCreditEarningSpend: moneyNumber(finalCareCharge),
    creditEarnRate: decimalNumber(D(config.creditEarnRate), 6),
    creditValueRupees: moneyNumber(D(config.creditValueRupees)),
    rawCreditsEarned: decimalNumber(credit.rawCredits, 4),
    nivraaCreditsEarned: credit.creditsEarned,
    creditExpiryDays: config.creditExpiryDays,
    pricingSnapshot,
    internalTrace: {
      selectedHours: input.selectedHours,
      minimumBooking: decimalNumber(minimumHours, 2),
      billableHours,
      baseHourlyRate: moneyNumber(baseHourlyRate),
      serviceMultiplier: decimalNumber(multiplier, 4),
      effectiveHourlyRate: toNullableMoney(effectiveHourlyRate),
      serviceTimeCharge: toNullableMoney(serviceTimeCharge),
      careCoordinationFee: moneyNumber(careCoordinationFee),
      standardCalculatedCarePrice: toNullableMoney(standardCareCharge),
      careChargeBeforeCredits: moneyNumber(careChargeBeforeCredits),
      requestedCreditDiscount: moneyNumber(requestedCredit),
      maximumCreditDiscount: moneyNumber(credit.maxAllowed),
      appliedCreditDiscount: moneyNumber(credit.applied),
      finalCareCharge: moneyNumber(finalCareCharge),
      transportTotal: moneyNumber(transport.total),
      totalPayable: moneyNumber(total),
      creditsEarned: credit.creditsEarned,
      serviceCode: service.serviceCode,
      pricingMode: service.pricingMode,
      pricingVersion,
      pricingStatus: status
    },
    internalCreditEconomics: {
      creditFaceValueIssued: moneyNumber(credit.creditFaceValueIssued),
      expectedCreditRedemptionCost: moneyNumber(credit.expectedCreditRedemptionCost),
      expectedRedemptionRate: decimalNumber(D(config.creditExpectedRedemptionRate), 6)
    }
  };
};
