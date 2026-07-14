import { z } from "zod";

export const httpToolDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*$/i, "Tool name must be alphanumeric"),
  description: z.string().min(1).max(500),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  url: z.string().url(),
  headers: z.record(z.string()).default({}),
  /** Zod-like JSON Schema description of args; validated at runtime via inputSchema. */
  timeoutMs: z.number().int().positive().max(30_000).default(8_000),
  allowHosts: z.array(z.string().min(1)).optional(),
});
export type HttpToolDefinition = z.infer<typeof httpToolDefinitionSchema>;

export const toolCallArgsSchema = z.record(z.unknown());
export type ToolCallArgs = z.infer<typeof toolCallArgsSchema>;

export interface ToolExecuteResult {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  durationMs: number;
}

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^metadata\.google\.internal$/i,
];

function hostnameAllowed(hostname: string, allowHosts?: string[]): boolean {
  if (allowHosts && allowHosts.length > 0) {
    return allowHosts.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );
  }
  return !BLOCKED_HOST_PATTERNS.some((re) => re.test(hostname));
}

/**
 * Execute an HTTP tool after Zod-validating the definition and args.
 * Blocks private/metadata hosts unless allowHosts is set.
 */
export async function executeHttpTool(
  definition: unknown,
  args: unknown,
  options?: { signal?: AbortSignal; inputSchema?: z.ZodTypeAny },
): Promise<ToolExecuteResult> {
  const started = Date.now();
  const def = httpToolDefinitionSchema.parse(definition);
  const parsedArgs = options?.inputSchema
    ? options.inputSchema.parse(args)
    : toolCallArgsSchema.parse(args ?? {});

  let url: URL;
  try {
    url = new URL(def.url);
  } catch {
    return { ok: false, error: "Invalid tool URL", durationMs: Date.now() - started };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http(s) URLs are allowed", durationMs: Date.now() - started };
  }

  if (!hostnameAllowed(url.hostname, def.allowHosts)) {
    return {
      ok: false,
      error: `Host not allowed: ${url.hostname}`,
      durationMs: Date.now() - started,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), def.timeoutMs);
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  try {
    const init: RequestInit = {
      method: def.method,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...def.headers,
      },
      signal: controller.signal,
    };

    if (def.method !== "GET" && def.method !== "DELETE") {
      init.body = JSON.stringify(parsedArgs);
    } else if (parsedArgs && typeof parsedArgs === "object") {
      for (const [key, value] of Object.entries(parsedArgs as Record<string, unknown>)) {
        if (value == null) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : `HTTP ${res.status}`,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool request failed";
    return { ok: false, error: message, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export function parseHttpToolDefinition(input: unknown): HttpToolDefinition {
  return httpToolDefinitionSchema.parse(input);
}
