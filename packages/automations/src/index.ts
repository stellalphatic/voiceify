import type { HttpToolDefinition } from "@voiceify/tools";
import { z } from "zod";

export { executePackTool, type PackToolResult } from "./execute.js";

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
  tools: HttpToolDefinition[];
  checklist: string[];
}

const PLACEHOLDER_HOST = "https://hooks.example.invalid";

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
      method: "POST",
      url: `${PLACEHOLDER_HOST}/restaurant/reservations`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
    {
      name: "check_availability",
      description: "Check table availability for a party size and time",
      method: "POST",
      url: `${PLACEHOLDER_HOST}/restaurant/availability`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
  ],
  checklist: [
    "Connect your reservation webhook URL",
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
      method: "POST",
      url: `${PLACEHOLDER_HOST}/receptionist/intake`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
    {
      name: "route_to_department",
      description: "Route the caller to a department queue",
      method: "POST",
      url: `${PLACEHOLDER_HOST}/receptionist/route`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
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
      method: "POST",
      url: `${PLACEHOLDER_HOST}/appointments/book`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
    {
      name: "reschedule_appointment",
      description: "Move an existing appointment to a new time",
      method: "POST",
      url: `${PLACEHOLDER_HOST}/appointments/reschedule`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
    {
      name: "cancel_appointment",
      description: "Cancel an existing appointment",
      method: "POST",
      url: `${PLACEHOLDER_HOST}/appointments/cancel`,
      headers: {},
      timeoutMs: 8000,
      allowHosts: ["hooks.example.invalid"],
    },
  ],
  checklist: [
    "Connect calendar / booking API credentials",
    "Confirm available providers and services",
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
