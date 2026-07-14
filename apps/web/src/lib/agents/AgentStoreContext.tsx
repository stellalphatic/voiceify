import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DASHBOARD_AGENTS_STORAGE_KEY,
  DEFAULT_VOICE_AGENTS,
  agentPersonaId,
  findAgentForPersona,
  loadDashboardAgents,
  saveDashboardAgents,
  type StoredVoiceAgent,
} from "@voiceify/shared";
import { apiJson, getActiveOrgId } from "../auth/client";

export type AppAgent = StoredVoiceAgent & { serverId?: string };

interface AgentStoreValue {
  agents: AppAgent[];
  setAgents: React.Dispatch<React.SetStateAction<AppAgent[]>>;
  updateAgent: (agent: AppAgent) => void;
  getAgentById: (id: number) => AppAgent | undefined;
  getAgentForPersona: (personaId: string) => AppAgent | undefined;
  refreshFromApi: () => Promise<void>;
  orgId: string | null;
}

const AgentStoreContext = createContext<AgentStoreValue | null>(null);

function uuidToNumericId(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || Date.now();
}

function mergeWithDefaults(stored: AppAgent[]): AppAgent[] {
  if (!stored.length) return DEFAULT_VOICE_AGENTS;

  const defaultsById = new Map(DEFAULT_VOICE_AGENTS.map((a) => [a.id, a]));
  const merged: AppAgent[] = stored.map((agent) => {
    const base = defaultsById.get(agent.id);
    return {
      ...base,
      ...agent,
      personaId: agent.personaId ?? base?.personaId,
      isDemoDefault: agent.isDemoDefault ?? base?.isDemoDefault ?? false,
    };
  });

  for (const fallback of DEFAULT_VOICE_AGENTS) {
    if (!merged.some((a) => a.id === fallback.id && !a.serverId)) {
      merged.push(fallback);
    }
  }

  for (const demoDefault of DEFAULT_VOICE_AGENTS.filter((a) => a.isDemoDefault)) {
    const hasDemo = merged.some(
      (a) => a.isDemoDefault && agentPersonaId(a) === agentPersonaId(demoDefault),
    );
    if (!hasDemo) merged.push(demoDefault);
  }

  return merged;
}

export function AgentStoreProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(() => getActiveOrgId());
  const [agents, setAgents] = useState<AppAgent[]>(() =>
    mergeWithDefaults(loadDashboardAgents(DEFAULT_VOICE_AGENTS)),
  );

  const refreshFromApi = useCallback(async () => {
    const activeOrg = getActiveOrgId();
    setOrgId(activeOrg);
    if (!activeOrg) return;

    try {
      const data = await apiJson<{
        agents: Array<{
          id: string;
          name: string;
          type: string;
          language: string;
          status: string;
          greeting: string | null;
          voiceId: string | null;
          capabilities: Record<string, unknown>;
          triggers: Record<string, unknown>;
        }>;
      }>(`/api/orgs/${activeOrg}/agents`);

      const mapped: AppAgent[] = data.agents.map((a) => ({
        id: uuidToNumericId(a.id),
        serverId: a.id,
        name: a.name,
        type: a.type,
        language: a.language,
        status: a.status === "active" ? "Active" : "Inactive",
        greeting: a.greeting ?? undefined,
        voice: a.voiceId ?? undefined,
        capabilities: Object.keys(a.capabilities ?? {}),
        triggers: Object.keys(a.triggers ?? {}),
        isDemoDefault: false,
      }));

      setAgents((prev) => {
        const demos = prev.filter((p) => p.isDemoDefault && !p.serverId);
        return mergeWithDefaults([...mapped, ...demos]);
      });
    } catch {
      /* keep local cache when API unavailable */
    }
  }, []);

  useEffect(() => {
    saveDashboardAgents(agents);
  }, [agents]);

  useEffect(() => {
    void refreshFromApi();
  }, [refreshFromApi]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DASHBOARD_AGENTS_STORAGE_KEY) return;
      try {
        const parsed = event.newValue
          ? (JSON.parse(event.newValue) as AppAgent[])
          : [];
        if (Array.isArray(parsed)) setAgents(mergeWithDefaults(parsed));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateAgent = useCallback((agent: AppAgent) => {
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, ...agent } : a)));

    // Persist server agents so edits survive refresh / other clients
    const activeOrg = getActiveOrgId();
    if (activeOrg && agent.serverId) {
      void apiJson(`/api/orgs/${activeOrg}/agents/${agent.serverId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: agent.name,
          type: agent.type,
          language: agent.language,
          greeting: agent.greeting,
          voiceId: agent.voice,
          capabilities: Object.fromEntries(
            (agent.capabilities ?? []).map((c) => [c, true]),
          ),
          triggers: Object.fromEntries(
            (agent.triggers ?? []).map((t) => [t, true]),
          ),
        }),
      }).catch(() => {
        /* keep optimistic local state; refresh later */
      });
    }
  }, []);

  const getAgentById = useCallback(
    (id: number) => agents.find((a) => a.id === id),
    [agents],
  );

  const getAgentForPersona = useCallback(
    (personaId: string) => findAgentForPersona(agents, personaId),
    [agents],
  );

  const value = useMemo(
    () => ({
      agents,
      setAgents,
      updateAgent,
      getAgentById,
      getAgentForPersona,
      refreshFromApi,
      orgId,
    }),
    [agents, updateAgent, getAgentById, getAgentForPersona, refreshFromApi, orgId],
  );

  return (
    <AgentStoreContext.Provider value={value}>{children}</AgentStoreContext.Provider>
  );
}

export function useAgentStore(): AgentStoreValue {
  const ctx = useContext(AgentStoreContext);
  if (!ctx) throw new Error("useAgentStore must be used within AgentStoreProvider");
  return ctx;
}
