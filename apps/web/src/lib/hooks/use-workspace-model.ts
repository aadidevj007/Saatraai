'use client';

/** Workspace data model: real records, or the marked demo dataset in demo mode. */

import { useMemo } from 'react';

import type {
  ConclusionRecord,
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
  InvestigationQuery,
  IngestedImage,
} from '@/lib/api/types';
import { computeConfidence, type ConfidenceReport } from '@/lib/analysis/confidence';
import { buildTimeline, type TimelineEvent } from '@/lib/analysis/timeline';
import { buildDemoModel } from '@/lib/demo/demo-data';
import { useInvestigationBundle, type InvestigationBundle } from '@/lib/hooks/queries';

export interface MissingEvidenceItem {
  id: string;
  label: string;
  status: 'NOT AVAILABLE';
  reason: string;
}

export interface WorkspaceModel {
  demo: boolean;
  demoNote: string | null;
  hypotheses: HypothesisRecord[];
  evidence: EvidenceRecord[];
  conclusions: ConclusionRecord[];
  executions: ExecutionTrace[];
  queries: InvestigationQuery[];
  images: IngestedImage[];
  timeline: TimelineEvent[];
  confidence: ConfidenceReport | null;
  missingEvidence: MissingEvidenceItem[];
  unavailable: Set<string>;
  isLoading: boolean;
}

export function useWorkspaceModel(id: string | undefined): {
  model: WorkspaceModel;
  bundle: InvestigationBundle;
} {
  const bundle = useInvestigationBundle(id);
  const { config } = bundle;

  const model = useMemo<WorkspaceModel>(() => {
    const isDemo = config?.mode === 'demo';
    const demo = isDemo && config ? buildDemoModel(config) : null;

    const queries = bundle.queries ?? [];
    const images = bundle.images ?? [];
    const evidence = demo ? demo.evidence : (bundle.evidence ?? []);
    const hypotheses = demo ? demo.hypotheses : (bundle.hypotheses ?? []);
    const conclusions = demo ? demo.conclusions : (bundle.conclusions ?? []);
    const executions = demo && bundle.executions && bundle.executions.length === 0 ? demo.executions : (bundle.executions ?? []);

    const timeline = buildTimeline({
      queries,
      images,
      executions,
      evidence,
      hypotheses,
    });

    const confidence = evidence.length > 0 ? computeConfidence(evidence) : null;

    let missingEvidence: MissingEvidenceItem[];
    if (demo) {
      missingEvidence = demo.missingEvidence;
    } else if (bundle.unavailable.has('evidence')) {
      missingEvidence = [];
    } else {
      missingEvidence = evidence
        .filter((e) => e.polarity === 'insufficient')
        .map((e) => ({
          id: e.id,
          label: String(e.provenance?.tool_name ?? e.provenance?.provider ?? 'Unknown source'),
          status: 'NOT AVAILABLE' as const,
          reason: e.summary,
        }));
    }

    return {
      demo: Boolean(demo),
      demoNote: demo?.note ?? null,
      hypotheses,
      evidence,
      conclusions,
      executions,
      queries,
      images,
      timeline,
      confidence,
      missingEvidence,
      unavailable: bundle.unavailable,
      isLoading: bundle.isLoading,
    };
  }, [bundle, config]);

  return { model, bundle };
}
