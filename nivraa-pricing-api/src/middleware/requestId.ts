import { FastifyInstance } from "fastify";

export const registerRequestIdHeader = (app: FastifyInstance): void => {
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });
};
