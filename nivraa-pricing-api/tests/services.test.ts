import { describe, expect, it } from "vitest";
import { serviceMaster } from "../src/config/serviceMaster";

describe("Service Master integrity", () => {
  it("contains unique, valid, typed service definitions", () => {
    expect(serviceMaster.length).toBeGreaterThanOrEqual(30);
    const codes = new Set<string>();

    for (const service of serviceMaster) {
      expect(service.serviceCode.length).toBeGreaterThan(0);
      expect(service.serviceName.length).toBeGreaterThan(0);
      expect(service.category.length).toBeGreaterThan(0);
      expect(Number(service.serviceMultiplier)).toBeGreaterThan(0);
      expect(["AUTO", "MANUAL"]).toContain(service.pricingMode);
      expect(service.numberOfAngels).toBeGreaterThanOrEqual(1);
      expect(typeof service.active).toBe("boolean");
      expect(codes.has(service.serviceCode)).toBe(false);
      codes.add(service.serviceCode);
    }
  });

  it("keeps known manual services manual", () => {
    const manualCodes = serviceMaster.filter((s) => s.pricingMode === "MANUAL").map((s) => s.serviceCode);
    expect(manualCodes).toEqual(expect.arrayContaining(["OVERNIGHT", "MULTI_DAY_12H", "MEDICAL_TOURISM_24H"]));
  });
});
