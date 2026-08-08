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
  createAgent: (agent: AppAgent) => Promise<AppAgent>;
  deleteAgent: (agent: AppAgent) => Promise<void>;
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

/** Workspace agents only — never inject marketing demo personas into a tenant UI. */
function sanitizeWorkspaceAgents(stored: AppAgent[]): AppAgent[] {
  return stored.filter((a) => !a.isDemoDefault);
}

export function AgentStoreProvider({ children }: { children: ReactNode }) {
  const [orgId, setOrgId] = useState<string | null>(() => getActiveOrgId());
  const [agents, setAgents] = useState<AppAgent[]>(() =>
    sanitizeWorkspaceAgents(loadDashboardAgents([])),
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
        const localDrafts = prev.filter((p) => !p.serverId && !p.isDemoDefault);
        return sanitizeWorkspaceAgents([...mapped, ...localDrafts]);
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
        if (Array.isArray(parsed)) setAgents(sanitizeWorkspaceAgents(parsed));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateAgent = useCallback((agent: AppAgent) => {
    // Callers may build a fresh object and drop serverId; recover it from the
    // stored record so the edit still reaches the API.
    let serverId = agent.serverId;
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agent.id) return a;
        serverId = serverId ?? a.serverId;
        return { ...a, ...agent, serverId };
      }),
    );

    const activeOrg = getActiveOrgId();
    if (activeOrg && serverId) {
      void apiJson(`/api/orgs/${activeOrg}/agents/${serverId}`, {
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

  const createAgent = useCallback(async (agent: AppAgent): Promise<AppAgent> => {
    const activeOrg = getActiveOrgId();
    if (!activeOrg) {
      setAgents((prev) => [...prev, { ...agent, isDemoDefault: false }]);
      return agent;
    }

    const created = await apiJson<{
      agent: {
        id: string;
        name: string;
        type: string;
        language: string;
        status: string;
        greeting: string | null;
        voiceId: string | null;
      };
    }>(`/api/orgs/${activeOrg}/agents`, {
      method: "POST",
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
    });

    const mapped: AppAgent = {
      ...agent,
      id: uuidToNumericId(created.agent.id),
      serverId: created.agent.id,
      name: created.agent.name,
      type: created.agent.type,
      language: created.agent.language,
      status: created.agent.status === "active" ? "Active" : "Inactive",
      greeting: created.agent.greeting ?? undefined,
      voice: created.agent.voiceId ?? undefined,
      isDemoDefault: false,
    };
    setAgents((prev) => [...prev, mapped]);
    return mapped;
  }, []);

  const deleteAgent = useCallback(async (agent: AppAgent) => {
    const activeOrg = getActiveOrgId();
    if (activeOrg && agent.serverId) {
      await apiJson(`/api/orgs/${activeOrg}/agents/${agent.serverId}`, {
        method: "DELETE",
      });
    }
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
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
      createAgent,
      deleteAgent,
      getAgentById,
      getAgentForPersona,
      refreshFromApi,
      orgId,
    }),
    [
      agents,
      updateAgent,
      createAgent,
      deleteAgent,
      getAgentById,
      getAgentForPersona,
      refreshFromApi,
      orgId,
    ],
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
