import { timingSafeEqual } from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";

const secureEqual = (provided: string | undefined, expected: string | undefined): boolean => {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const requireApiKey = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const expected = process.env.API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      reply.code(503).send({ error: { code: "SERVICE_MISCONFIGURED", message: "API authentication is not configured.", request_id: request.id } });
      return;
    }
    return;
  }

  const provided = request.headers["x-api-key"] as string | undefined;
  if (!secureEqual(provided, expected)) {
    reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "A valid API key is required.", request_id: request.id } });
  }
};

export const hasValidAdminKey = (request: FastifyRequest): boolean => {
  const expected = process.env.ADMIN_API_KEY;
  const provided = request.headers["x-admin-api-key"] as string | undefined;
  return secureEqual(provided, expected);
};
