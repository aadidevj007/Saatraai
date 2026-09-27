'use client';

/** Evidence graph — layered DAG over real investigation records. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Waypoints } from 'lucide-react';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, Button, EmptyState, LoadingState, Panel, Select } from '@/components/ui';
import { graphApi } from '@/lib/api';
import type { GraphEdge, GraphNode } from '@/lib/analysis/graph';
import { useInvestigations } from '@/lib/hooks/queries';
import { useWorkspaceModel } from '@/lib/hooks/use-workspace-model';
import { cn } from '@/lib/utils';

const COLUMN_ORDER: GraphNode['type'][] = ['question', 'dataset', 'analysis', 'model', 'evidence', 'hypothesis', 'conclusion'];

const TYPE_STYLE: Record<GraphNode['type'], { color: string; label: string }> = {
  question: { color: '#22d3ee', label: 'Question' },
  dataset: { color: '#2dd4bf', label: 'Dataset' },
  analysis: { color: '#3b82f6', label: 'Analysis' },
  model: { color: '#a78bfa', label: 'Model' },
  evidence: { color: '#f59e0b', label: 'Evidence' },
  hypothesis: { color: '#f43f5e', label: 'Hypothesis' },
  conclusion: { color: '#34d399', label: 'Conclusion' },
};

const EDGE_COLOR: Record<string, string> = {
  SUPPORTS: '#34d399',
  CONTRADICTS: '#f43f5e',
  WEAKENS: '#f43f5e',
  PRODUCES: '#3b82f6',
  ROUTES_TO: '#3b82f6',
  EXECUTES: '#a78bfa',
  INPUT_TO: '#2dd4bf',
  ANSWERS: '#22d3ee',
  CONCLUDES: '#34d399',
  ASSOCIATED_WITH: '#93a7bc',
};

const COL_WIDTH = 210;
const ROW_HEIGHT = 96;
const NODE_W = 168;
const NODE_H = 58;

export default function EvidenceGraphPage() {
  const router = useRouter();
  usePageTitle('Evidence Graph');

  const investigationsQuery = useInvestigations({ page: 1, page_size: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1100, h: 620 });
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  /* deep link ?inv=… */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const inv = new URLSearchParams(window.location.search).get('inv');
      if (inv) setSelectedId(inv);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* default to first investigation */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!selectedId && investigationsQuery.data?.items.length) {
        setSelectedId(investigationsQuery.data.items[0].id);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [investigationsQuery.data, selectedId]);

  const { model, bundle } = useWorkspaceModel(selectedId ?? undefined);

  const graph = useMemo(
    () =>
      graphApi.build({
        queries: model.queries,
        images: model.images,
        executions: model.executions,
        evidence: model.evidence,
        hypotheses: model.hypotheses,
        conclusions: model.conclusions,
      }),
    [model],
  );

  /* layered layout */
  const layout = useMemo(() => {
    const columns = new Map<GraphNode['type'], GraphNode[]>();
    for (const type of COLUMN_ORDER) columns.set(type, []);
    for (const node of graph.nodes) columns.get(node.type)!.push(node);

    let maxRows = 0;
    for (const list of columns.values()) maxRows = Math.max(maxRows, list.length);

    const positions = new Map<string, { x: number; y: number }>();
    COLUMN_ORDER.forEach((type, colIndex) => {
      const list = columns.get(type)!;
      const totalHeight = list.length * ROW_HEIGHT;
      list.forEach((node, rowIndex) => {
        positions.set(node.id, {
          x: 40 + colIndex * COL_WIDTH,
          y: (maxRows * ROW_HEIGHT - totalHeight) / 2 + rowIndex * ROW_HEIGHT + 30,
        });
      });
    });

    const width = 80 + COLUMN_ORDER.length * COL_WIDTH;
    const height = Math.max(200, maxRows * ROW_HEIGHT + 80);
    return { positions, width, height };
  }, [graph]);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  /* pan + zoom */
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const investigations = investigationsQuery.data?.items ?? [];

  return (
    <div className="mx-auto flex h-full max-w-[1500px] flex-col px-6 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <Waypoints className="h-5 w-5 text-primary" /> Evidence Graph
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Nodes are persisted records; edges carry meaning. Click a node to inspect its connections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedId ?? ''}
            onChange={(e) => {
              setSelectedId(e.target.value || null);
              setActiveNode(null);
            }}
            aria-label="Select investigation"
            className="w-72"
          >
            <option value="">Select investigation…</option>
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.title}
              </option>
            ))}
          </Select>
          {selectedId && (
            <Link href={`/investigations/${selectedId}`}>
              <Button variant="secondary" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Workspace
              </Button>
            </Link>
          )}
        </div>
      </div>

      {investigationsQuery.isPending ? (
        <div className="mt-6"><LoadingState label="Loading investigations…" /></div>
      ) : investigations.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No investigations yet"
            description="Create an investigation to build its evidence graph."
            action={{ label: 'New investigation', onClick: () => router.push('/investigations/new') }}
          />
        </div>
      ) : !selectedId ? (
        <div className="mt-6">
          <EmptyState title="Select an investigation" description="Pick one above to assemble its evidence graph from persisted records." />
        </div>
      ) : bundle.isLoading ? (
        <div className="mt-6"><LoadingState label="Assembling graph…" /></div>
      ) : graph.nodes.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No records to graph yet"
            description="Questions, scenes, executions, evidence, hypotheses and conclusions appear here as they are recorded."
          />
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 gap-4">
          {/* graph canvas */}
          <Panel className="relative min-h-0 flex-1 overflow-hidden" bodyClassName="h-full p-0">
            <svg
              className="h-full w-full cursor-grab active:cursor-grabbing"
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              onWheel={(e) => {
                const factor = e.deltaY > 0 ? 1.1 : 0.9;
                setViewBox((v) => {
                  const w = Math.min(2400, Math.max(400, v.w * factor));
                  const h = Math.min(1600, Math.max(240, v.h * factor));
                  return { ...v, w, h };
                });
              }}
              onPointerDown={(e) => {
                dragRef.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
                (e.target as Element).setPointerCapture?.(e.pointerId);
              }}
              onPointerMove={(e) => {
                const drag = dragRef.current;
                if (!drag) return;
                const scale = viewBox.w / (e.currentTarget.clientWidth || 1);
                setViewBox((v) => ({ ...v, x: drag.vx - (e.clientX - drag.x) * scale, y: drag.vy - (e.clientY - drag.y) * scale }));
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerLeave={() => (dragRef.current = null)}
              role="img"
              aria-label="Evidence graph"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5f75" />
                </marker>
              </defs>

              {/* edges */}
              <g>
                {graph.edges.map((edge) => {
                  const from = layout.positions.get(edge.source);
                  const to = layout.positions.get(edge.target);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_W;
                  const y1 = from.y + NODE_H / 2;
                  const x2 = to.x;
                  const y2 = to.y + NODE_H / 2;
                  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
                  return (
                    <path
                      key={edge.id}
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={EDGE_COLOR[edge.type] ?? '#4b5f75'}
                      strokeWidth={1.4}
                      strokeOpacity={0.6}
                      strokeDasharray={edge.type === 'CONTRADICTS' ? '5 4' : undefined}
                      markerEnd="url(#arrow)"
                    >
                      <title>{edge.type}</title>
                    </path>
                  );
                })}
              </g>

              {/* nodes */}
              <g>
                {graph.nodes.map((node) => {
                  const pos = layout.positions.get(node.id);
                  if (!pos) return null;
                  const style = TYPE_STYLE[node.type];
                  const active = activeNode?.id === node.id;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        setActiveNode(node);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        width={NODE_W}
                        height={NODE_H}
                        rx={9}
                        fill={active ? '#142131' : '#0f1924'}
                        stroke={active ? style.color : '#1f2e40'}
                        strokeWidth={active ? 2 : 1}
                      />
                      <rect width={4} height={NODE_H} rx={2} fill={style.color} />
                      <text x={14} y={20} fontSize={9} fill={style.color} fontFamily="IBM Plex Mono, monospace" letterSpacing={1.2}>
                        {style.label.toUpperCase()}
                      </text>
                      <text x={14} y={38} fontSize={11} fill="#e6f1fa">
                        {truncate(node.label, 26)}
                      </text>
                      {node.detail && (
                        <text x={14} y={51} fontSize={9} fill="#5d7086" fontFamily="IBM Plex Mono, monospace">
                          {truncate(node.detail, 30)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/95 px-3 py-2">
              {Object.entries(TYPE_STYLE).map(([type, style]) => (
                <span key={type} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-dim">
                  <span className="h-2 w-2 rounded-sm" style={{ background: style.color }} />
                  {style.label}
                </span>
              ))}
            </div>
          </Panel>

          {/* inspector */}
          <aside className="w-72 shrink-0">
            <Panel title="Inspector" subtitle={activeNode ? TYPE_STYLE[activeNode.type].label : 'Nothing selected'} className="h-full">
              {!activeNode ? (
                <p className="text-[12.5px] text-ink-faint">Click a node to see its label, details and connections.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: TYPE_STYLE[activeNode.type].color }}>
                      {TYPE_STYLE[activeNode.type].label}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink">{activeNode.label}</p>
                    {activeNode.detail && <p className="mt-1 font-mono text-[11px] text-ink-faint">{activeNode.detail}</p>}
                    {activeNode.polarity && <div className="mt-2"><Badge tone={activeNode.polarity === 'supporting' ? 'success' : activeNode.polarity === 'contradicting' ? 'danger' : activeNode.polarity === 'insufficient' ? 'warning' : 'neutral'}>{activeNode.polarity}</Badge></div>}
                  </div>

                  <div>
                    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Connections</div>
                    <ul className="space-y-1.5">
                      {graph.edges.filter((e: GraphEdge) => e.source === activeNode.id || e.target === activeNode.id).map((edge) => {
                        const otherId = edge.source === activeNode.id ? edge.target : edge.source;
                        const other = nodeById.get(otherId);
                        if (!other) return null;
                        return (
                          <li key={edge.id}>
                            <button
                              onClick={() => setActiveNode(other)}
                              className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-left transition-colors hover:border-line-strong"
                            >
                              <span className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color: EDGE_COLOR[edge.type] ?? '#93a7bc' }}>
                                {edge.source === activeNode.id ? `→ ${edge.type}` : `← ${edge.type}`}
                              </span>
                              <span className="block truncate text-[11.5px] text-ink-dim">{other.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {graph.edges.filter((e) => e.source === activeNode.id || e.target === activeNode.id).length === 0 && (
                      <p className="text-[12px] text-ink-faint">No connections recorded.</p>
                    )}
                  </div>

                  <div className="border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    node id · {activeNode.id}
                  </div>
                </div>
              )}
            </Panel>
          </aside>
        </div>
      )}

      {/* stats bar */}
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        <span className={cn('flex items-center gap-1.5')}>
          <Waypoints className="h-3 w-3" /> {graph.nodes.length} nodes · {graph.edges.length} edges
        </span>
        {model.demo && <Badge tone="demo">DEMO DATA</Badge>}
        <span>scroll to zoom · drag to pan</span>
        <span className="ml-auto">assembled from persisted records — no synthetic edges</span>
      </div>
    </div>
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
