import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GitBranch,
  MessageSquare,
  Mic,
  Split,
  Trash2,
  Wrench,
  CircleDot,
  Flag,
} from 'lucide-react';
import { getActiveOrgId } from '../../lib/auth/client';
import { SMB_CONNECTORS, type ConnectorBrand } from '../../lib/connectors/catalog';
import { BrandIcon } from '../connectors/BrandIcons';

export type WfNodeType = 'start' | 'collect' | 'tool' | 'branch' | 'end' | 'speak';

export type WfNode = {
  id: string;
  type: WfNodeType;
  label: string;
  x: number;
  y: number;
  connectorId?: string;
  brand?: ConnectorBrand;
};

export type WfEdge = {
  id: string;
  from: string;
  to: string;
};

type Graph = { nodes: WfNode[]; edges: WfEdge[] };

const NODE_W = 168;
const NODE_H = 64;

const DEFAULT_GRAPH: Graph = {
  nodes: [
    { id: 'n-start', type: 'start', label: 'Caller starts', x: 48, y: 120 },
    { id: 'n-collect', type: 'collect', label: 'Collect details', x: 280, y: 120 },
    {
      id: 'n-sheets',
      type: 'tool',
      label: 'Log to Sheets',
      x: 520,
      y: 60,
      connectorId: 'google-sheets',
      brand: 'google-sheets',
    },
    {
      id: 'n-wa',
      type: 'tool',
      label: 'WhatsApp ping',
      x: 520,
      y: 180,
      connectorId: 'whatsapp-business',
      brand: 'whatsapp',
    },
    { id: 'n-speak', type: 'speak', label: 'Confirm booking', x: 760, y: 120 },
    { id: 'n-end', type: 'end', label: 'End call', x: 1000, y: 120 },
  ],
  edges: [
    { id: 'e1', from: 'n-start', to: 'n-collect' },
    { id: 'e2', from: 'n-collect', to: 'n-sheets' },
    { id: 'e3', from: 'n-collect', to: 'n-wa' },
    { id: 'e4', from: 'n-sheets', to: 'n-speak' },
    { id: 'e5', from: 'n-wa', to: 'n-speak' },
    { id: 'e6', from: 'n-speak', to: 'n-end' },
  ],
};

function storageKey(orgId: string | null) {
  return `voiceify.workflow.canvas.v2.${orgId ?? 'local'}`;
}

function loadGraph(orgId: string | null): Graph {
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    if (!raw) return structuredClone(DEFAULT_GRAPH);
    const parsed = JSON.parse(raw) as Graph;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return structuredClone(DEFAULT_GRAPH);
    }
    return parsed;
  } catch {
    return structuredClone(DEFAULT_GRAPH);
  }
}

function portCenter(node: WfNode, side: 'in' | 'out') {
  return {
    x: side === 'out' ? node.x + NODE_W : node.x,
    y: node.y + NODE_H / 2,
  };
}

function bezier(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = Math.max(48, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

const LOGIC_NODES: Array<{ type: WfNodeType; label: string; icon: typeof Mic }> = [
  { type: 'collect', label: 'Collect', icon: MessageSquare },
  { type: 'speak', label: 'Speak', icon: Mic },
  { type: 'branch', label: 'Branch', icon: Split },
  { type: 'tool', label: 'HTTP tool', icon: Wrench },
  { type: 'end', label: 'End', icon: Flag },
];

export default function WorkflowCanvas() {
  const orgId = getActiveOrgId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<Graph>(() => loadGraph(orgId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const connectingRef = useRef(false);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    setGraph(loadGraph(orgId));
  }, [orgId]);

  useEffect(() => {
    window.localStorage.setItem(storageKey(orgId), JSON.stringify(graph));
  }, [graph, orgId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (selectedEdgeId) {
        setGraph((g) => ({ ...g, edges: g.edges.filter((ed) => ed.id !== selectedEdgeId) }));
        setSelectedEdgeId(null);
        return;
      }
      if (selectedId && selectedId !== 'n-start') {
        setGraph((g) => ({
          nodes: g.nodes.filter((n) => n.id !== selectedId),
          edges: g.edges.filter((ed) => ed.from !== selectedId && ed.to !== selectedId),
        }));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, selectedEdgeId]);

  const nodeById = useMemo(() => {
    const m = new Map<string, WfNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const selected = selectedId ? nodeById.get(selectedId) : null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragRef.current) {
        const { id, offsetX, offsetY } = dragRef.current;
        setGraph((g) => ({
          ...g,
          nodes: g.nodes.map((n) =>
            n.id === id
              ? { ...n, x: Math.max(8, x - offsetX), y: Math.max(8, y - offsetY) }
              : n,
          ),
        }));
      }
      if (draft) {
        setDraft((d) => (d ? { ...d, x, y } : d));
      }
    },
    [draft],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const addNode = (partial: Omit<WfNode, 'id' | 'x' | 'y'> & { x?: number; y?: number }) => {
    const id = `n-${partial.type}-${Date.now().toString(36)}`;
    const x = partial.x ?? 140 + (graph.nodes.length % 5) * 36;
    const y = partial.y ?? 160 + (graph.nodes.length % 4) * 40;
    setGraph((g) => ({
      ...g,
      nodes: [...g.nodes, { ...partial, id, x, y }],
    }));
    setSelectedId(id);
    setSelectedEdgeId(null);
    flash(`Added “${partial.label}”`);
  };

  const deleteSelected = () => {
    if (selectedEdgeId) {
      setGraph((g) => ({ ...g, edges: g.edges.filter((ed) => ed.id !== selectedEdgeId) }));
      setSelectedEdgeId(null);
      return;
    }
    if (!selectedId) return;
    if (selectedId === 'n-start') {
      flash('Start node is locked');
      return;
    }
    setGraph((g) => ({
      nodes: g.nodes.filter((n) => n.id !== selectedId),
      edges: g.edges.filter((e) => e.from !== selectedId && e.to !== selectedId),
    }));
    setSelectedId(null);
  };

  const connect = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setGraph((g) => {
      if (g.edges.some((e) => e.from === fromId && e.to === toId)) return g;
      return {
        ...g,
        edges: [...g.edges, { id: `e-${Date.now().toString(36)}`, from: fromId, to: toId }],
      };
    });
  };

  const updateSelectedLabel = (label: string) => {
    if (!selectedId) return;
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === selectedId ? { ...n, label } : n)),
    }));
  };

  return (
    <div className="vfy-wf-shell">
      <aside className="vfy-wf-palette" aria-label="Node palette">
        <p className="vfy-wf-palette-title">Logic</p>
        {LOGIC_NODES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              type="button"
              className="vfy-wf-palette-item"
              onClick={() => addNode({ type: item.type, label: item.label })}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}

        <p className="vfy-wf-palette-title" style={{ marginTop: 14 }}>
          Business connectors
        </p>
        {SMB_CONNECTORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="vfy-wf-palette-item vfy-wf-palette-item--brand"
            onClick={() =>
              addNode({
                type: 'tool',
                label: c.name,
                connectorId: c.id,
                brand: c.brand,
              })
            }
            title={`Add ${c.name} node`}
          >
            <BrandIcon brand={c.brand} size={16} />
            {c.name}
          </button>
        ))}

        <button
          type="button"
          className="vfy-btn vfy-btn-ghost"
          style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
          onClick={() => {
            setGraph(structuredClone(DEFAULT_GRAPH));
            setSelectedId(null);
            setSelectedEdgeId(null);
            flash('Canvas reset');
          }}
        >
          <GitBranch size={12} />
          Reset template
        </button>
      </aside>

      <div className="vfy-wf-stage">
        <div className="vfy-wf-stage-bar">
          <p className="vfy-settings-help" style={{ margin: 0, flex: 1 }}>
            Drag nodes. Drag from the green port to connect. Click an edge to select it. Delete key
            removes selection (Start is locked).
          </p>
          {(selectedId || selectedEdgeId) && (
            <button type="button" className="vfy-btn vfy-btn-ghost" onClick={deleteSelected}>
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>

        <div
          ref={wrapRef}
          className="vfy-wf-canvas-wrap"
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            endDrag();
            if (draft) {
              const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
              const toId = el?.closest('[data-wf-node]')?.getAttribute('data-wf-node');
              if (toId) connect(draft.fromId, toId);
              setDraft(null);
              connectingRef.current = false;
            }
          }}
          onPointerLeave={() => {
            endDrag();
            /* Keep draft alive while connecting; only clear on pointer up. */
            if (!connectingRef.current) setDraft(null);
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
              setSelectedId(null);
              setSelectedEdgeId(null);
            }
          }}
        >
          <svg className="vfy-wf-svg" aria-hidden>
            {graph.edges.map((edge) => {
              const from = nodeById.get(edge.from);
              const to = nodeById.get(edge.to);
              if (!from || !to) return null;
              const a = portCenter(from, 'out');
              const b = portCenter(to, 'in');
              const selected = selectedEdgeId === edge.id;
              return (
                <path
                  key={edge.id}
                  className={`vfy-wf-edge${selected ? ' is-selected' : ''}`}
                  d={bezier(a, b)}
                  style={{ pointerEvents: 'stroke' }}
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedId(null);
                  }}
                />
              );
            })}
            {draft &&
              (() => {
                const from = nodeById.get(draft.fromId);
                if (!from) return null;
                const a = portCenter(from, 'out');
                return (
                  <path
                    className="vfy-wf-edge vfy-wf-edge-draft"
                    d={bezier(a, { x: draft.x, y: draft.y })}
                  />
                );
              })()}
          </svg>

          {graph.nodes.map((node) => (
            <div
              key={node.id}
              data-wf-node={node.id}
              className={`vfy-wf-node vfy-wf-node--${node.type}${selectedId === node.id ? ' is-selected' : ''}`}
              style={{ left: node.x, top: node.y, width: NODE_W }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).dataset.port) return;
                e.preventDefault();
                setSelectedId(node.id);
                setSelectedEdgeId(null);
                const rect = wrapRef.current?.getBoundingClientRect();
                if (!rect) return;
                dragRef.current = {
                  id: node.id,
                  offsetX: e.clientX - rect.left - node.x,
                  offsetY: e.clientY - rect.top - node.y,
                };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
            >
              {node.type !== 'start' && (
                <span
                  className="vfy-wf-port vfy-wf-port--in"
                  data-port="in"
                  title="Input"
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (draft) {
                      connect(draft.fromId, node.id);
                      setDraft(null);
                      connectingRef.current = false;
                    }
                  }}
                />
              )}
              <div className="vfy-wf-node-row">
                {node.brand ? (
                  <BrandIcon brand={node.brand} size={16} />
                ) : node.type === 'start' ? (
                  <CircleDot size={14} />
                ) : node.type === 'speak' ? (
                  <Mic size={14} />
                ) : node.type === 'branch' ? (
                  <Split size={14} />
                ) : node.type === 'end' ? (
                  <Flag size={14} />
                ) : (
                  <MessageSquare size={14} />
                )}
                <p className="vfy-wf-node-title">{node.label}</p>
              </div>
              <p className="vfy-wf-node-type">{node.brand ?? node.type}</p>
              {node.type !== 'end' && (
                <span
                  className="vfy-wf-port vfy-wf-port--out"
                  data-port="out"
                  title="Drag to connect"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = wrapRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    connectingRef.current = true;
                    setDraft({
                      fromId: node.id,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }}
                />
              )}
            </div>
          ))}

          {toast && <div className="vfy-wf-toast">{toast}</div>}
        </div>

        {selected && (
          <div className="vfy-wf-inspector">
            <p className="vfy-wf-palette-title">Inspector</p>
            <label className="vfy-field" style={{ display: 'block' }}>
              <span className="vfy-field-label">Label</span>
              <input
                className="vfy-field-input"
                value={selected.label}
                onChange={(e) => updateSelectedLabel(e.target.value)}
                disabled={selected.id === 'n-start'}
              />
            </label>
            <p className="vfy-settings-item-meta" style={{ marginTop: 8 }}>
              Type: <strong>{selected.type}</strong>
              {selected.connectorId ? ` · ${selected.connectorId}` : ''}
            </p>
            {selected.brand && (
              <p className="vfy-settings-item-meta">
                Connect this tool under Integrations or Tools so Sandbox can call it live.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
