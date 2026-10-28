/** Evidence-graph construction from real investigation records. */

import type {
  ConclusionRecord,
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
  IngestedImage,
  InvestigationQuery,
} from '@/lib/api/types';

export type GraphNodeType =
  | 'question'
  | 'hypothesis'
  | 'evidence'
  | 'dataset'
  | 'analysis'
  | 'model'
  | 'conclusion';

export type GraphEdgeType =
  | 'ROUTES_TO'
  | 'EXECUTES'
  | 'PRODUCES'
  | 'INPUT_TO'
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'ASSOCIATED_WITH'
  | 'CONCLUDES'
  | 'ANSWERS';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  detail?: string;
  polarity?: string;
  demo?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
}

export interface EvidenceGraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildGraphInput {
  queries?: InvestigationQuery[] | null;
  images?: IngestedImage[] | null;
  executions?: ExecutionTrace[] | null;
  evidence?: EvidenceRecord[] | null;
  hypotheses?: HypothesisRecord[] | null;
  conclusions?: ConclusionRecord[] | null;
}

export function buildEvidenceGraph(input: BuildGraphInput): EvidenceGraphModel {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const addNode = (node: GraphNode) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    nodes.push(node);
  };

  for (const q of input.queries ?? []) {
    addNode({ id: `q-${q.id}`, type: 'question', label: q.text, detail: `query #${q.sequence}` });
  }
  for (const img of input.images ?? []) {
    addNode({
      id: `img-${img.id}`,
      type: 'dataset',
      label: img.original_filename,
      detail: `${String(img.modality)} · ${img.acquisition_at?.slice(0, 10) ?? 'acquisition unknown'}`,
    });
  }

  const modelNodes = new Set<string>();
  for (const t of input.executions ?? []) {
    addNode({
      id: `run-${t.task_id}`,
      type: 'analysis',
      label: t.selected_task,
      detail: `${t.selected_tool} · ${String(t.status)}`,
    });
    const modelId = `model-${t.selected_tool}`;
    if (!modelNodes.has(modelId)) {
      modelNodes.add(modelId);
      addNode({
        id: modelId,
        type: 'model',
        label: t.selected_tool,
        detail: t.model_version ?? 'version unknown',
      });
      edges.push({ id: `e-${modelId}`, source: `run-${t.task_id}`, target: modelId, type: 'EXECUTES' });
    } else {
      edges.push({ id: `e-run-model-${t.task_id}`, source: `run-${t.task_id}`, target: modelId, type: 'EXECUTES' });
    }
    const queryNode = `q-${t.query_id}`;
    if (seen.has(queryNode)) {
      edges.push({ id: `e-route-${t.task_id}`, source: queryNode, target: `run-${t.task_id}`, type: 'ROUTES_TO' });
    }
    for (const inputId of t.input_ids) {
      const imgNode = `img-${inputId}`;
      if (seen.has(imgNode)) {
        edges.push({ id: `e-in-${t.task_id}-${inputId}`, source: imgNode, target: `run-${t.task_id}`, type: 'INPUT_TO' });
      }
    }
  }

  for (const e of input.evidence ?? []) {
    addNode({
      id: `ev-${e.id}`,
      type: 'evidence',
      label: e.summary,
      detail: e.polarity,
      polarity: e.polarity,
    });
    if (e.query_id && seen.has(`q-${e.query_id}`)) {
      edges.push({ id: `e-ans-${e.id}`, source: `ev-${e.id}`, target: `q-${e.query_id}`, type: 'ANSWERS' });
    }
    if (e.model_run_id && seen.has(`run-${e.model_run_id}`)) {
      edges.push({ id: `e-prod-${e.id}`, source: `run-${e.model_run_id}`, target: `ev-${e.id}`, type: 'PRODUCES' });
    }
    if (e.hypothesis_id && seen.has(`hyp-${e.hypothesis_id}`)) {
      const type: GraphEdgeType =
        e.polarity === 'supporting'
          ? 'SUPPORTS'
          : e.polarity === 'contradicting'
            ? 'CONTRADICTS'
            : 'ASSOCIATED_WITH';
      edges.push({ id: `e-hyp-${e.id}`, source: `ev-${e.id}`, target: `hyp-${e.hypothesis_id}`, type });
    }
  }

  for (const h of input.hypotheses ?? []) {
    addNode({ id: `hyp-${h.id}`, type: 'hypothesis', label: h.statement, detail: h.assessment_state });
    // Link evidence attached at read time
    for (const e of h.evidence ?? []) {
      if (!seen.has(`ev-${e.id}`)) continue;
      const type: GraphEdgeType =
        e.polarity === 'supporting'
          ? 'SUPPORTS'
          : e.polarity === 'contradicting'
            ? 'CONTRADICTS'
            : 'ASSOCIATED_WITH';
      edges.push({ id: `e-hypv-${e.id}`, source: `ev-${e.id}`, target: `hyp-${h.id}`, type });
    }
  }

  for (const c of input.conclusions ?? []) {
    addNode({ id: `con-${c.id}`, type: 'conclusion', label: c.summary, detail: c.state });
    if (c.hypothesis_id && seen.has(`hyp-${c.hypothesis_id}`)) {
      edges.push({ id: `e-con-${c.id}`, source: `con-${c.id}`, target: `hyp-${c.hypothesis_id}`, type: 'CONCLUDES' });
    }
  }

  const uniqueEdges = edges.filter((edge, index, all) => all.findIndex((e) => e.id === edge.id) === index);
  return { nodes, edges: uniqueEdges };
}
