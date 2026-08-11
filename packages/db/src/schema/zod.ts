import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { account, session, user, verification } from "./auth.js";
import {
  agentVersions,
  agents,
  automationInstalls,
  tools,
} from "./agents.js";
import {
  apiKeys,
  orgMembers,
  organizations,
  plans,
  subscriptions,
} from "./orgs.js";
import {
  conversations,
  messages,
  toolInvocations,
} from "./conversations.js";
import { creditLedger, usageDaily, usageEvents } from "./usage.js";
import { knowledgeChunks, knowledgeDocs } from "./knowledge.js";
import { embedConfigs, embedSessions, simulationScenarios } from "./embed.js";
import { webhookDeliveries, webhooks } from "./webhooks.js";

export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);
export const sessionSelectSchema = createSelectSchema(session);
export const sessionInsertSchema = createInsertSchema(session);
export const accountSelectSchema = createSelectSchema(account);
export const accountInsertSchema = createInsertSchema(account);
export const verificationSelectSchema = createSelectSchema(verification);
export const verificationInsertSchema = createInsertSchema(verification);

export const organizationSelectSchema = createSelectSchema(organizations);
export const organizationInsertSchema = createInsertSchema(organizations);
export const orgMemberSelectSchema = createSelectSchema(orgMembers);
export const orgMemberInsertSchema = createInsertSchema(orgMembers);
export const planSelectSchema = createSelectSchema(plans);
export const planInsertSchema = createInsertSchema(plans);
export const apiKeySelectSchema = createSelectSchema(apiKeys);
export const apiKeyInsertSchema = createInsertSchema(apiKeys);
export const subscriptionSelectSchema = createSelectSchema(subscriptions);
export const subscriptionInsertSchema = createInsertSchema(subscriptions);

export const agentSelectSchema = createSelectSchema(agents);
export const agentInsertSchema = createInsertSchema(agents);
export const agentVersionSelectSchema = createSelectSchema(agentVersions);
export const agentVersionInsertSchema = createInsertSchema(agentVersions);
export const toolSelectSchema = createSelectSchema(tools);
export const toolInsertSchema = createInsertSchema(tools);
export const automationInstallSelectSchema =
  createSelectSchema(automationInstalls);
export const automationInstallInsertSchema =
  createInsertSchema(automationInstalls);

export const conversationSelectSchema = createSelectSchema(conversations);
export const conversationInsertSchema = createInsertSchema(conversations);
export const messageSelectSchema = createSelectSchema(messages);
export const messageInsertSchema = createInsertSchema(messages);
export const toolInvocationSelectSchema = createSelectSchema(toolInvocations);
export const toolInvocationInsertSchema = createInsertSchema(toolInvocations);

export const knowledgeDocSelectSchema = createSelectSchema(knowledgeDocs);
export const knowledgeDocInsertSchema = createInsertSchema(knowledgeDocs);
export const knowledgeChunkSelectSchema = createSelectSchema(knowledgeChunks);
export const knowledgeChunkInsertSchema = createInsertSchema(knowledgeChunks);

export const usageEventSelectSchema = createSelectSchema(usageEvents);
export const usageEventInsertSchema = createInsertSchema(usageEvents);
export const usageDailySelectSchema = createSelectSchema(usageDaily);
export const usageDailyInsertSchema = createInsertSchema(usageDaily);
export const creditLedgerSelectSchema = createSelectSchema(creditLedger);
export const creditLedgerInsertSchema = createInsertSchema(creditLedger);

export const webhookSelectSchema = createSelectSchema(webhooks);
export const webhookInsertSchema = createInsertSchema(webhooks);
export const webhookDeliverySelectSchema = createSelectSchema(webhookDeliveries);
export const webhookDeliveryInsertSchema = createInsertSchema(webhookDeliveries);

export const embedConfigSelectSchema = createSelectSchema(embedConfigs);
export const embedConfigInsertSchema = createInsertSchema(embedConfigs);
export const embedSessionSelectSchema = createSelectSchema(embedSessions);
export const embedSessionInsertSchema = createInsertSchema(embedSessions);
export const simulationScenarioSelectSchema =
  createSelectSchema(simulationScenarios);
export const simulationScenarioInsertSchema =
  createInsertSchema(simulationScenarios);
