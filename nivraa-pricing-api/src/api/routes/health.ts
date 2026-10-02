import { FastifyInstance } from "fastify";
import { getPricingVersion } from "../../config/pricingVersion";

export const registerHealthRoute = async (app: FastifyInstance): Promise<void> => {
  app.get("/health", {
    schema: {
      tags: ["System"],
      summary: "Service health check",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            service: { type: "string" },
            pricing_version: { type: "string" }
          }
        }
      }
    }
  }, async () => ({
    status: "ok",
    service: "nivraa-pricing-api",
    pricing_version: getPricingVersion()
  }));
};
