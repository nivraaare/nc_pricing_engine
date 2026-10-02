import { describe, expect, it } from "vitest";
import { calculateCredits } from "../src/pricing/creditEngine";
import { D } from "../src/utils/money";

const policy = {
  enabled: true,
  earnRate: "0.05",
  valueRupees: "1",
  maxRedemptionPercentage: "0.20",
  expiryDays: 180,
  expectedRedemptionRate: "0.70"
};

describe("NivrāaCredit engine", () => {
  it("floors earned Credits and never rounds up", () => {
    const result = calculateCredits(D(1694), D(20), policy);
    expect(result.rawCredits.toNumber()).toBe(83.7);
    expect(result.creditsEarned).toBe(83);
  });

  it("caps redemption to 20% of care before Credits", () => {
    const result = calculateCredits(D(1694), D(500), policy);
    expect(result.maxAllowed.toFixed(2)).toBe("338.80");
    expect(result.applied.toFixed(2)).toBe("338.80");
  });

  it("computes internal expected loyalty cost from whole Credits issued", () => {
    const result = calculateCredits(D(1674), D(0), policy);
    expect(result.creditsEarned).toBe(83);
    expect(result.creditFaceValueIssued.toFixed(2)).toBe("83.00");
    expect(result.expectedCreditRedemptionCost.toFixed(2)).toBe("58.10");
  });
});
