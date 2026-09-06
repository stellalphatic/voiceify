import { z } from "zod";

export { executePackTool, type PackToolResult } from "./execute.js";

/**
 * Pack tools run in-process against Postgres via `executePackTool` — they are
 * not HTTP calls, so they carry no URL or host allowlist. Earlier revisions
 * reused the HTTP tool shape and filled it with placeholder hosts, which made
 * installed packs look like they pointed at an unreachable third party.
 */
export interface PackToolDefinition {
  name: string;
  description: string;
  /** Storage the tool reads and writes, surfaced in the UI. */
  writesTo: string;
  /** JSON Schema sent to the LLM and used to collect complete arguments. */
  inputSchema: Record<string, unknown>;
}

export const packIdSchema = z.enum(["restaurant", "receptionist", "appointments"]);
export type PackId = z.infer<typeof packIdSchema>;

export interface PackAgentDefinition {
  name: string;
  type: string;
  language: string;
  greeting: string;
  voiceId?: string;
  capabilities: string[];
  triggers: string[];
}

export interface AutomationPack {
  id: PackId;
  version: string;
  name: string;
  description: string;
  agents: PackAgentDefinition[];
  tools: PackToolDefinition[];
  checklist: string[];
}

export const RESTAURANT_PACK: AutomationPack = {
  id: "restaurant",
  version: "1.0.0",
  name: "Restaurant Front Desk",
  description: "Reservations, menu FAQ, and waitlist for restaurants.",
  agents: [
    {
      name: "Nova",
      type: "restaurant",
      language: "en",
      greeting: "Thanks for calling. How can I help with your reservation today?",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      capabilities: ["Reservations", "Menu Info", "Waitlist"],
      triggers: ["book a table", "reservation", "menu"],
    },
  ],
  tools: [
    {
      name: "create_reservation",
      description: "Create a restaurant reservation",
      writesTo: "Reservations table",
      inputSchema: {
        type: "object",
        properties: {
          guestName: { type: "string" },
          partySize: { type: "integer", minimum: 1, maximum: 50 },
          reservedAt: { type: "string", description: "ISO 8601 date and time" },
          guestPhone: { type: "string" },
          guestEmail: { type: "string" },
          notes: { type: "string" },
        },
        required: ["guestName", "partySize", "reservedAt"],
        additionalProperties: false,
      },
    },
    {
      name: "check_availability",
      description: "Check table availability for a party size and time",
      writesTo: "Reservations table",
      inputSchema: {
        type: "object",
        properties: {
          partySize: { type: "integer", minimum: 1, maximum: 50 },
          reservedAt: { type: "string", description: "ISO 8601 date and time" },
        },
        required: ["partySize", "reservedAt"],
        additionalProperties: false,
      },
    },
  ],
  checklist: [
    "Review the seeded menu items",
    "Confirm menu FAQ content",
    "Test a booking in the sandbox",
  ],
};

export const RECEPTIONIST_PACK: AutomationPack = {
  id: "receptionist",
  version: "1.0.0",
  name: "Clinic Receptionist",
  description: "Patient intake, routing, and FAQs for clinics and offices.",
  agents: [
    {
      name: "Alex",
      type: "receptionist",
      language: "en",
      greeting: "Hello, you've reached the front desk. How can I help?",
      voiceId: "pNInz6obpgDQGcFmaJgB",
      capabilities: ["Intake", "Routing", "Hours & Location"],
      triggers: ["hours", "location", "speak to", "intake"],
    },
  ],
  tools: [
    {
      name: "create_intake",
      description: "Capture a new caller intake record",
      writesTo: "Intake messages table",
      inputSchema: {
        type: "object",
        properties: {
          body: { type: "string" },
          fromName: { type: "string" },
          fromContact: { type: "string" },
          subject: { type: "string" },
        },
        required: ["body", "fromName", "fromContact"],
        additionalProperties: false,
      },
    },
    {
      name: "route_to_department",
      description: "Route the caller to a department queue",
      writesTo: "Departments table",
      inputSchema: {
        type: "object",
        properties: { department: { type: "string" } },
        required: ["department"],
        additionalProperties: false,
      },
    },
  ],
  checklist: [
    "Set office hours and departments",
    "Configure escalation contacts",
    "Test routing in the sandbox",
  ],
};

export const APPOINTMENTS_PACK: AutomationPack = {
  id: "appointments",
  version: "1.0.0",
  name: "Appointments Scheduler",
  description: "Book, reschedule, and cancel appointments for healthcare and services.",
  agents: [
    {
      name: "Dr. Sarah",
      type: "healthcare",
      language: "en",
      greeting: "Hi, I can help you book or change an appointment. What do you need?",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      capabilities: ["Book", "Reschedule", "Cancel"],
      triggers: ["appointment", "reschedule", "cancel"],
    },
  ],
  tools: [
    {
      name: "book_appointment",
      description: "Book a new appointment slot",
      writesTo: "Appointments table",
      inputSchema: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          customerContact: { type: "string" },
          startsAt: { type: "string", description: "ISO 8601 date and time" },
          notes: { type: "string" },
        },
        required: ["customerName", "customerContact", "startsAt"],
        additionalProperties: false,
      },
    },
    {
      name: "reschedule_appointment",
      description: "Move an existing appointment to a new time",
      writesTo: "Appointments table",
      inputSchema: {
        type: "object",
        properties: {
          appointmentId: { type: "string", format: "uuid" },
          startsAt: { type: "string", description: "ISO 8601 date and time" },
        },
        required: ["appointmentId", "startsAt"],
        additionalProperties: false,
      },
    },
    {
      name: "cancel_appointment",
      description: "Cancel an existing appointment",
      writesTo: "Appointments table",
      inputSchema: {
        type: "object",
        properties: { appointmentId: { type: "string", format: "uuid" } },
        required: ["appointmentId"],
        additionalProperties: false,
      },
    },
  ],
  checklist: [
    "Confirm available providers and services",
    "Add an external calendar sync tool if you need one",
    "Test book + cancel in the sandbox",
  ],
};

export const AUTOMATION_PACKS: Record<PackId, AutomationPack> = {
  restaurant: RESTAURANT_PACK,
  receptionist: RECEPTIONIST_PACK,
  appointments: APPOINTMENTS_PACK,
};

export function getPack(id: PackId): AutomationPack {
  return AUTOMATION_PACKS[id];
}

export function listPacks(): AutomationPack[] {
  return Object.values(AUTOMATION_PACKS);
}
