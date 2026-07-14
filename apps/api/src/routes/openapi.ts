import { Hono } from "hono";

export const openapiRoutes = new Hono();

openapiRoutes.get("/openapi.json", (c) => {
  return c.json({
    openapi: "3.1.0",
    info: {
      title: "Voiceify API",
      version: "1.0.0",
      description:
        "Multi-tenant Voice AI SaaS API: agents, tools, automations, usage, and embed sessions.",
    },
    servers: [{ url: process.env.BETTER_AUTH_URL ?? "http://localhost:3001" }],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/auth/{path}": {
        get: { summary: "Better Auth handler" },
        post: { summary: "Better Auth handler" },
      },
      "/api/orgs": {
        get: { summary: "List organizations for current session" },
        post: { summary: "Create organization" },
      },
      "/api/orgs/{orgId}/agents": {
        get: { summary: "List agents" },
        post: { summary: "Create agent" },
      },
      "/api/orgs/{orgId}/agents/{agentId}/deploy": {
        post: { summary: "Deploy agent version" },
      },
      "/api/orgs/{orgId}/tools": {
        get: { summary: "List tools" },
        post: { summary: "Create tool" },
      },
      "/api/orgs/{orgId}/automations/install": {
        post: { summary: "Install automation pack" },
      },
      "/api/orgs/{orgId}/usage": { get: { summary: "Usage events" } },
      "/api/orgs/{orgId}/billing": { get: { summary: "Billing + credits" } },
      "/api/orgs/{orgId}/billing/topup": {
        post: { summary: "Top up credits (Stripe test / demo)" },
      },
      "/api/orgs/{orgId}/knowledge": {
        get: { summary: "List knowledge docs" },
        post: { summary: "Upload/ingest knowledge text" },
      },
      "/api/orgs/{orgId}/conversations": {
        get: { summary: "List conversations" },
      },
      "/api/orgs/{orgId}/analytics": { get: { summary: "Org analytics" } },
      "/api/voice/{orgId}/agents/{agentId}/turn": {
        post: {
          summary: "Authenticated voice turn (NDJSON stream)",
        },
      },
      "/api/embed/public/session": {
        post: { summary: "Bootstrap embed widget session" },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "better-auth.session_token" },
        apiKey: { type: "apiKey", in: "header", name: "x-voiceify-key" },
      },
    },
  });
});
