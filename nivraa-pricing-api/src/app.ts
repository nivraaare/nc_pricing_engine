import Fastify, { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { InMemoryPricingConfigRepository } from "./repositories/InMemoryPricingConfigRepository";
import { PricingApplicationService } from "./pricing/pricingApplicationService";
import { registerHealthRoute } from "./api/routes/health";
import { registerServicesRoute } from "./api/routes/services";
import { registerPricingRoute } from "./api/routes/pricing";
import { registerRequestIdHeader } from "./middleware/requestId";

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      redact: {
        paths: [
          'req.headers["x-api-key"]', 
          'req.headers["x-admin-api-key"]', 
          'headers["x-api-key"]', 
          'headers["x-admin-api-key"]'
        ],
        censor: "[REDACTED]"
      }
    },
    disableRequestLogging: false
  });

  await app.register(helmet);
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 100),
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute"
  });

  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  await app.register(cors, {
    origin: corsOrigin ? corsOrigin.split(",").map((value) => value.trim()) : process.env.NODE_ENV !== "production"
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "NivrāaCare Pricing API",
        description: "Deterministic production pricing engine for NivrāaCare.",
        version: "1.0.0"
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key"
          }
        }
      }
    }
  });

  const docsEnabled = process.env.ENABLE_DOCS !== "false" && process.env.NODE_ENV !== "production";
  if (docsEnabled) {
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  registerRequestIdHeader(app);

  const repository = new InMemoryPricingConfigRepository();
  const pricingService = new PricingApplicationService(repository);

  await registerHealthRoute(app);
  await registerServicesRoute(app, repository);
  await registerPricingRoute(app, pricingService);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "unhandled request error");
    if (reply.sent) return;
    reply.code(error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500).send({
      error: {
        code: error.statusCode && error.statusCode < 500 ? "REQUEST_ERROR" : "INTERNAL_SERVER_ERROR",
        message: error.statusCode && error.statusCode < 500 ? error.message : "An unexpected error occurred.",
        request_id: request.id
      }
    });
  });

  return app;
};
