import { buildOpenApiSpec } from "@voiceify/shared";
import { Hono } from "hono";

export const openapiRoutes = new Hono();

openapiRoutes.get("/openapi.json", (c) => {
  const configuredOrigin =
    process.env.APP_URL || process.env.WEB_ORIGIN || new URL(c.req.url).origin;
  return c.json(buildOpenApiSpec(`${configuredOrigin.replace(/\/$/, "")}/api`));
});
