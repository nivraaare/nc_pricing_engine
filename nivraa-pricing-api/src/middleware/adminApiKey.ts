import { FastifyReply, FastifyRequest } from "fastify";
import { hasValidAdminKey } from "./apiKey";

export const requireAdminApiKey = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!hasValidAdminKey(request)) {
    reply.code(403).send({ error: { code: "ADMIN_AUTH_REQUIRED", message: "Founder/admin authorization is required for a price override.", request_id: request.id } });
  }
};
