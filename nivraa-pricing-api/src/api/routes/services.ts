import { FastifyInstance } from "fastify";
import { requireApiKey } from "../../middleware/apiKey";
import { PricingConfigRepository } from "../../repositories/PricingConfigRepository";

export const registerServicesRoute = async (
  app: FastifyInstance,
  repository: PricingConfigRepository
): Promise<void> => {
  app.get("/api/v1/services", {
    preHandler: requireApiKey,
    schema: {
      tags: ["Pricing"],
      summary: "List active customer-safe services",
      security: [{ ApiKeyAuth: [] }]
    }
  }, async () => repository.listActiveServices().map((service) => ({
    service_code: service.serviceCode,
    service_name: service.serviceName,
    category: service.category,
    pricing_mode: service.pricingMode
  })));
};
