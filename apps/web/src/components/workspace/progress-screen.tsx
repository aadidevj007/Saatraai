'use client';

/** Investigation progress screen — stage reveal driven by real pipeline state. */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import type { PipelineStage } from '@/components/workspace/control-panel';
import { cn } from '@/lib/utils';

const STATE_ICON = {
  done: CheckCircle2,
  active: Loader2,
  waiting: Circle,
  unavailable: AlertOctagon,
} as const;

const STATE_COLOR = {
  done: 'text-success',
  active: 'text-primary',
  waiting: 'text-ink-faint',
  unavailable: 'text-warning',
} as const;

export function ProgressScreen({ stages, demo, onDone }: { stages: PipelineStage[]; demo: boolean; onDone: () => void }) {
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    if (revealed >= stages.length) return;
    const t = window.setTimeout(() => setRevealed((r) => r + 1), 420);
    return () => window.clearTimeout(t);
  }, [revealed, stages.length]);

  const finished = revealed >= stages.length;

  useEffect(() => {
    if (!finished) return;
    const t = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(t);
  }, [finished, onDone]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-void/95 backdrop-blur-sm">
      <div className="w-full max-w-lg px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary">Investigation started</p>
            <h2 className="mt-1 text-[19px] font-semibold text-ink">Assembling investigation</h2>
          </div>
          <Badge tone={demo ? 'demo' : 'primary'}>{demo ? 'DEMO MODE' : 'REAL MODE'}</Badge>
        </div>

        <ol className="space-y-2.5">
          {stages.map((stage, index) => {
            const visible = index < revealed;
            const finalState: PipelineStage['state'] = visible ? stage.state : 'waiting';
            const FinalIcon = STATE_ICON[finalState];
            return (
              <motion.li
                key={stage.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: visible ? 1 : 0.35, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5"
              >
                <FinalIcon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    STATE_COLOR[finalState],
                    visible && stage.state === 'active' && 'animate-spin',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className={cn('font-mono text-[11px] tracking-[0.1em]', visible && stage.state !== 'waiting' ? 'text-ink' : 'text-ink-faint')}>
                    {stage.label}
                  </div>
                  <div className="truncate text-[11.5px] text-ink-faint">
                    {stage.state === 'unavailable' ? 'NOT CONFIGURED on this deployment' : visible ? stage.detail : 'queued'}
                  </div>
                </div>
                <span className="font-mono text-[9.5px] text-ink-faint">
                  {stage.state === 'done' && visible ? '✓' : stage.state === 'unavailable' && visible ? '!' : '○'}
                </span>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-6 flex items-center justify-between">
          <p className="max-w-xs text-[11.5px] leading-relaxed text-ink-faint">
            Stage statuses come from persisted records — stages the deployment cannot execute are marked NOT
            CONFIGURED instead of simulated.
          </p>
          <Button variant="primary" onClick={onDone} icon={<ArrowRight className="h-4 w-4" />}>
            Enter workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
