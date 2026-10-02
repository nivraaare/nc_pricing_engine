import Decimal from "decimal.js";
import { D, moneyNumber, decimalNumber, wholeFloor } from "../utils/money";

export interface CreditPolicy {
  enabled: boolean;
  earnRate: string;
  valueRupees: string;
  maxRedemptionPercentage: string;
  expiryDays: number;
  expectedRedemptionRate: string;
}

export interface CreditResult {
  requested: Decimal;
  maxAllowed: Decimal;
  applied: Decimal;
  eligibleEarningSpend: Decimal;
  rawCredits: Decimal;
  creditsEarned: number;
  creditFaceValueIssued: Decimal;
  expectedCreditRedemptionCost: Decimal;
}

export const calculateCredits = (
  careChargeBeforeCredits: Decimal,
  requestedDiscount: Decimal,
  policy: CreditPolicy
): CreditResult => {
  if (!policy.enabled) {
    return {
      requested: requestedDiscount,
      maxAllowed: D(0),
      applied: D(0),
      eligibleEarningSpend: careChargeBeforeCredits,
      rawCredits: D(0),
      creditsEarned: 0,
      creditFaceValueIssued: D(0),
      expectedCreditRedemptionCost: D(0)
    };
  }

  const maxAllowed = careChargeBeforeCredits.mul(policy.maxRedemptionPercentage);
  const applied = Decimal.min(requestedDiscount, maxAllowed, careChargeBeforeCredits);
  const eligibleEarningSpend = careChargeBeforeCredits.minus(applied);
  const rawCredits = eligibleEarningSpend.mul(policy.earnRate).div(policy.valueRupees);
  const creditsEarned = wholeFloor(rawCredits);
  const creditFaceValueIssued = D(creditsEarned).mul(policy.valueRupees);
  const expectedCreditRedemptionCost = creditFaceValueIssued.mul(policy.expectedRedemptionRate);

  return {
    requested: requestedDiscount,
    maxAllowed,
    applied,
    eligibleEarningSpend,
    rawCredits,
    creditsEarned,
    creditFaceValueIssued,
    expectedCreditRedemptionCost
  };
};

export const serializeCreditResult = (result: CreditResult) => ({
  creditDiscountRequested: moneyNumber(result.requested),
  creditDiscountMaxAllowed: moneyNumber(result.maxAllowed),
  creditDiscountApplied: moneyNumber(result.applied),
  eligibleCreditEarningSpend: moneyNumber(result.eligibleEarningSpend),
  rawCreditsEarned: decimalNumber(result.rawCredits, 4),
  nivraaCreditsEarned: result.creditsEarned,
  creditFaceValueIssued: moneyNumber(result.creditFaceValueIssued),
  expectedCreditRedemptionCost: moneyNumber(result.expectedCreditRedemptionCost)
});
