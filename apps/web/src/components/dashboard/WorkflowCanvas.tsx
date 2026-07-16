import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { getActiveOrgId } from '../../lib/auth/client';

export type WfNodeType = 'start' | 'collect' | 'tool' | 'branch' | 'end' | 'speak';

export type WfNode = {
  id: string;
  type: WfNodeType;
  label: string;
  x: number;
  y: number;
};

export type WfEdge = {
  id: string;
  from: string;
  to: string;
};

type Graph = { nodes: WfNode[]; edges: WfEdge[] };

const NODE_W = 160;
const NODE_H = 56;

const DEFAULT_GRAPH: Graph = {
  nodes: [
    { id: 'n-start', type: 'start', label: 'Start', x: 40, y: 80 },
    { id: 'n-collect', type: 'collect', label: 'Collect info', x: 260, y: 80 },
    { id: 'n-tool', type: 'tool', label: 'Call tool', x: 480, y: 80 },
    { id: 'n-ok', type: 'branch', label: 'Success', x: 480, y: 220 },
    { id: 'n-end', type: 'end', label: 'End', x: 700, y: 220 },
  ],
  edges: [
    { id: 'e1', from: 'n-start', to: 'n-collect' },
    { id: 'e2', from: 'n-collect', to: 'n-tool' },
    { id: 'e3', from: 'n-tool', to: 'n-ok' },
    { id: 'e4', from: 'n-ok', to: 'n-end' },
  ],
};

function storageKey(orgId: string | null) {
  return `voiceify.workflow.canvas.${orgId ?? 'local'}`;
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
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

const ADDABLE: Array<{ type: WfNodeType; label: string }> = [
  { type: 'collect', label: 'Collect' },
  { type: 'speak', label: 'Speak' },
  { type: 'tool', label: 'Tool' },
  { type: 'branch', label: 'Branch' },
  { type: 'end', label: 'End' },
];

export default function WorkflowCanvas() {
  const orgId = getActiveOrgId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<Graph>(() => loadGraph(orgId));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ fromId: string; x: number; y: number } | null>(null);
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

  const nodeById = useMemo(() => {
    const m = new Map<string, WfNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
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
  }, [draft]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const addNode = (type: WfNodeType, label: string) => {
    const id = `n-${type}-${Date.now().toString(36)}`;
    setGraph((g) => ({
      ...g,
      nodes: [
        ...g.nodes,
        { id, type, label, x: 120 + (g.nodes.length % 4) * 40, y: 140 + (g.nodes.length % 3) * 36 },
      ],
    }));
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
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

  return (
    <div>
      <div className="vfy-settings-row" style={{ marginBottom: 10 }}>
        <p className="vfy-settings-help" style={{ margin: 0, flex: 1 }}>
          Drag nodes, connect ports (output → input), and shape the conversation path. Saved for
          this workspace in-browser.
        </p>
        {selectedId && (
          <button type="button" className="vfy-btn vfy-btn-ghost" onClick={deleteSelected}>
            <Trash2 size={14} />
            Delete node
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
          }
        }}
        onPointerLeave={() => {
          endDrag();
          setDraft(null);
        }}
      >
        <div className="vfy-wf-toolbar">
          {ADDABLE.map((item) => (
            <button
              key={item.type}
              type="button"
              className="vfy-btn vfy-btn-ghost"
              onClick={() => addNode(item.type, item.label)}
            >
              <Plus size={12} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="vfy-btn vfy-btn-ghost"
            onClick={() => setGraph(structuredClone(DEFAULT_GRAPH))}
          >
            <GitBranch size={12} />
            Reset
          </button>
        </div>

        <svg className="vfy-wf-svg" aria-hidden>
          {graph.edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            const a = portCenter(from, 'out');
            const b = portCenter(to, 'in');
            return <path key={edge.id} className="vfy-wf-edge" d={bezier(a, b)} />;
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
            className={`vfy-wf-node${selectedId === node.id ? ' is-selected' : ''}`}
            style={{ left: node.x, top: node.y, width: NODE_W }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).dataset.port) return;
              e.preventDefault();
              setSelectedId(node.id);
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
                  }
                }}
              />
            )}
            <p className="vfy-wf-node-title">{node.label}</p>
            <p className="vfy-wf-node-type">{node.type}</p>
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
      </div>
    </div>
  );
}
