import { FastifyInstance } from "fastify";
import { hasValidAdminKey, requireApiKey } from "../../middleware/apiKey";
import { PricingApplicationService } from "../../pricing/pricingApplicationService";
import { quoteRequestSchema } from "../schemas/quoteRequest";
import { quoteResponseSchema } from "../schemas/quoteResponse";

export const registerPricingRoute = async (
  app: FastifyInstance,
  service: PricingApplicationService
): Promise<void> => {
  app.post("/api/v1/pricing/quote", {
    preHandler: requireApiKey,
    schema: {
      tags: ["Pricing"],
      summary: "Calculate a NivrāaCare quote",
      description: "Calculates care pricing, transport, NivrāaCredit redemption, and projected Credits earned. Pricing configuration is controlled server-side.",
      security: [{ ApiKeyAuth: [] }],
      response: { 200: quoteResponseSchema }
    }
  }, async (request, reply) => {
    const parsed = quoteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "The pricing request is invalid.",
          request_id: request.id,
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      });
    }

    const body = parsed.data;
    if (body.price_override_rupees !== undefined && !hasValidAdminKey(request)) {
      return reply.code(403).send({
        error: {
          code: "ADMIN_AUTH_REQUIRED",
          message: "Founder/admin authorization is required for a price override.",
          request_id: request.id
        }
      });
    }

    try {
      const { response, calculation } = service.quote({
        serviceCode: body.service_code,
        selectedHours: body.selected_hours,
        transportRequired: body.transport_required,
        estimatedCabFare: body.transport_required ? body.estimated_cab_fare : undefined,
        nivraaCreditDiscountRupees: body.nivraa_credit_discount_rupees,
        priceOverrideRupees: body.price_override_rupees,
        overrideReason: body.override_reason,
        overrideAuthorized: body.price_override_rupees === undefined ? undefined : true
      }, request.id);

      request.log.info({
        quoteId: response.quote_id,
        pricingVersion: response.pricing_version,
        serviceCode: response.service_code,
        pricingStatus: response.pricing_status,
        totalCustomerPayable: response.total_customer_payable,
        creditsEarned: response.nivraa_credits_earned,
        internalCreditEconomics: calculation.internalCreditEconomics
      }, "pricing quote calculated");

      return reply.code(200).send(response);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_SERVICE_CODE") {
        return reply.code(400).send({
          error: {
            code: "INVALID_SERVICE_CODE",
            message: "The requested service is unavailable.",
            request_id: request.id
          }
        });
      }
      throw error;
    }
  });
};
