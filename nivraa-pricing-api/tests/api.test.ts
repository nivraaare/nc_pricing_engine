import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

let app: FastifyInstance;

beforeEach(async () => {
  process.env.NODE_ENV = "test";
  process.env.API_KEY = "test-api-key";
  process.env.ADMIN_API_KEY = "test-admin-key";
  process.env.ENABLE_DOCS = "false";
  process.env.LOG_LEVEL = "silent";
  app = await buildApp();
});

afterEach(async () => {
  await app.close();
});

const headers = { "x-api-key": "test-api-key" };

describe("HTTP API", () => {
  it("health endpoint is public", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "nivraa-pricing-api" });
  });

  it("requires API key for quote endpoint", async () => {
    const response = await app.inject({ method: "POST", url: "/api/v1/pricing/quote", payload: {} });
    expect(response.statusCode).toBe(401);
  });

  it("returns the approved ₹2,323 quote", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5,
        transport_required: true,
        estimated_cab_fare: 500,
        nivraa_credit_discount_rupees: 20
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total_customer_payable).toBe(2323);
    expect(body.nivraa_credits_earned).toBe(83);
    expect(body.pricing_status).toBe("VALID");
    expect(body.customer_quote.total_payable).toBe(2323);
    expect(body.customer_quote).not.toHaveProperty("serviceMultiplier");
  });

  it("rejects unknown fields including attempts to inject pricing config", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5,
        transport_required: false,
        nivraa_credit_discount_rupees: 0,
        base_hourly_rate: 1
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("rejects invalid service code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "NOT_A_SERVICE",
        selected_hours: 5,
        transport_required: false,
        nivraa_credit_discount_rupees: 0
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_SERVICE_CODE");
  });

  it("requires cab fare when NivrāaCare arranges transport", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5,
        transport_required: true,
        nivraa_credit_discount_rupees: 0
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects non-half-hour durations", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5.25,
        transport_required: false,
        nivraa_credit_discount_rupees: 0
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("does not allow founder override without admin key", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5,
        transport_required: false,
        nivraa_credit_discount_rupees: 0,
        price_override_rupees: 1500,
        override_reason: "Founder-approved launch offer"
      }
    });
    expect(response.statusCode).toBe(403);
  });

  it("requires override reason", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers: { ...headers, "x-admin-api-key": "test-admin-key" },
      payload: {
        service_code: "HOSPITAL_VISIT",
        selected_hours: 5,
        transport_required: false,
        nivraa_credit_discount_rupees: 0,
        price_override_rupees: 1500
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("allows admin override and applies Credits afterwards", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers: { ...headers, "x-admin-api-key": "test-admin-key" },
      payload: {
        service_code: "OVERNIGHT",
        selected_hours: 8,
        transport_required: false,
        nivraa_credit_discount_rupees: 100,
        price_override_rupees: 1800,
        override_reason: "Founder approved"
      }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.care_charge_before_credits).toBe(1800);
    expect(body.final_care_charge).toBe(1700);
    expect(body.nivraa_credits_earned).toBe(85);
  });

  it("services endpoint exposes customer-safe fields only", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/services", headers });
    expect(response.statusCode).toBe(200);
    const list = response.json();
    expect(list.length).toBeGreaterThanOrEqual(30);
    expect(list[0]).toHaveProperty("service_code");
    expect(list[0]).not.toHaveProperty("serviceMultiplier");
    expect(list[0]).not.toHaveProperty("service_multiplier");
  });
});

describe("request validation boundaries", () => {
  const invalidCases = [
    ["zero hours", { service_code: "HOSPITAL_VISIT", selected_hours: 0, transport_required: false, nivraa_credit_discount_rupees: 0 }],
    ["negative hours", { service_code: "HOSPITAL_VISIT", selected_hours: -1, transport_required: false, nivraa_credit_discount_rupees: 0 }],
    [">24 hours", { service_code: "HOSPITAL_VISIT", selected_hours: 24.5, transport_required: false, nivraa_credit_discount_rupees: 0 }],
    ["negative cab", { service_code: "HOSPITAL_VISIT", selected_hours: 5, transport_required: true, estimated_cab_fare: -1, nivraa_credit_discount_rupees: 0 }],
    ["negative Credit redemption", { service_code: "HOSPITAL_VISIT", selected_hours: 5, transport_required: false, nivraa_credit_discount_rupees: -1 }]
  ] as const;

  for (const [name, payload] of invalidCases) {
    it(`rejects ${name}`, async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/pricing/quote", headers, payload });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("INVALID_REQUEST");
    });
  }

  it("remains stateless across concurrent quotes", async () => {
    const payloads = [
      { service_code: "HOSPITAL_VISIT", selected_hours: 5, transport_required: false, nivraa_credit_discount_rupees: 0 },
      { service_code: "HOSPITAL_VISIT", selected_hours: 5, transport_required: true, estimated_cab_fare: 500, nivraa_credit_discount_rupees: 20 },
      { service_code: "HOSPITAL_ONLY", selected_hours: 5, transport_required: false, nivraa_credit_discount_rupees: 0 }
    ];

    const responses = await Promise.all(payloads.map((payload) => app.inject({
      method: "POST",
      url: "/api/v1/pricing/quote",
      headers,
      payload
    })));

    expect(responses.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    expect(responses.map((r) => r.json().total_customer_payable)).toEqual([1694, 2323, 1395]);
  });
});
