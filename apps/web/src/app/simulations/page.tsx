'use client';

/**
 * Next-Gen Interactive Simulation & Scenario Lab
 *
 * Demonstrates the full SAATRAAI reasoning pipeline in real time.
 * Adheres strictly to scientific integrity rules:
 * Visible and persistent labelling of synthetic/simulated data.
 */

import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Flame,
  MapPin,
  Play,
  Radar,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Waves,
  Wind,
} from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { Button, ButtonLink } from '@/components/ui';

interface ScenarioDef {
  id: string;
  title: string;
  region: string;
  coordinates: string;
  icon: typeof Waves;
  category: string;
  temporalWindow: string;
  question: string;
  hypotheses: Array<{
    id: string;
    statement: string;
    expectedState: 'supported' | 'under_review' | 'refuted';
    confidence: number;
    supportingCount: number;
    contradictingCount: number;
  }>;
  simulatedLogs: string[];
  metrics: {
    sensorCount: number;
    pixelResolution: string;
    anomalyScore: string;
    falsificationRate: string;
  };
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'flood-brahmaputra',
    title: 'Brahmaputra Flood & Embankment Breach',
    region: 'Assam Valley, India',
    coordinates: '26.2006° N, 92.9376° E',
    icon: Waves,
    category: 'Hydrological Disaster',
    temporalWindow: 'June 2024 – August 2024 (Bi-Temporal)',
    question: 'Why has catastrophic flood extent increased across the Majuli sub-basin during the 2024 monsoon?',
    metrics: {
      sensorCount: 3,
      pixelResolution: '10m (Sentinel-1 SAR / Sentinel-2)',
      anomalyScore: '+41.8% Water Fraction',
      falsificationRate: '1 Contradiction Identified',
    },
    hypotheses: [
      {
        id: 'H1',
        statement: 'Excessive upstream precipitation totals in the Arunachal foothills exceeded the 10-year drainage capacity.',
        expectedState: 'supported',
        confidence: 0.84,
        supportingCount: 4,
        contradictingCount: 1,
      },
      {
        id: 'H2',
        statement: 'Localized embankment structural failure along the southern channel allowed uncontrolled river avulsion.',
        expectedState: 'supported',
        confidence: 0.76,
        supportingCount: 3,
        contradictingCount: 0,
      },
      {
        id: 'H3',
        statement: 'Agricultural conversion of wetlands eliminated natural flood retention storage.',
        expectedState: 'under_review',
        confidence: 0.48,
        supportingCount: 1,
        contradictingCount: 2,
      },
    ],
    simulatedLogs: [
      'INITIALIZING SIMULATION: Brahmaputra Flood Inundation Scenario (SYNTHETIC)',
      'FETCHING REGION MASK: Assam Majuli Sub-basin BBOX [92.12, 25.88, 93.65, 27.10]',
      'INGESTING SENSOR: Sentinel-1 IW GRD (C-Band VV/VH backscatter delta)',
      'INGESTING SENSOR: Sentinel-2 Level-2A (MNDWI Modified Normalized Difference Water Index)',
      'COMPUTING TEMPORAL DELTA: Pre-monsoon baseline vs Peak discharge week',
      'DETECTING RADAR COHERENCE: Water surface detected across 1,842 sq km (+41.8% baseline)',
      'RUNNING CONTRADICTION AUDIT: Cross-referencing precipitation with historical dry-season runoff',
      'FLAG: Contradiction found for H3 — dry season agricultural cells retained water balance',
      'SYNTHESIZING CAUSAL GRAPH: Upstream precipitation (0.84) and Embankment failure (0.76) primary drivers',
      'SIMULATION COMPLETED: Audit package generated with synthetic cryptographic hash 0x7fa2c4...e81',
    ],
  },
  {
    id: 'wildfire-california',
    title: 'Coastal Range Wildfire Burn Severity',
    region: 'Sonoma & Napa Counties, CA',
    coordinates: '38.2919° N, 122.4580° W',
    icon: Flame,
    category: 'Pyrogenic Incident',
    temporalWindow: 'September 2024 – October 2024',
    question: 'What environmental vectors accelerated the perimeter spread across ridge-top canopies?',
    metrics: {
      sensorCount: 4,
      pixelResolution: '20m (SWIR / NIR Normalized Burn Ratio)',
      anomalyScore: 'Delta-NBR -0.68',
      falsificationRate: '2 Contradictions Identified',
    },
    hypotheses: [
      {
        id: 'H1',
        statement: 'Diablo offshore downslope winds created localized ember spotting across the western ridge.',
        expectedState: 'supported',
        confidence: 0.88,
        supportingCount: 5,
        contradictingCount: 0,
      },
      {
        id: 'H2',
        statement: 'Extended fuel moisture deficit in south-facing chaparral enabled high fire intensity.',
        expectedState: 'supported',
        confidence: 0.79,
        supportingCount: 3,
        contradictingCount: 1,
      },
    ],
    simulatedLogs: [
      'INITIALIZING SIMULATION: Coastal Range Wildfire Burn Severity (SYNTHETIC)',
      'CALCULATING NBR DELTA: Landsat-9 + Sentinel-2 SWIR2 (Band 12) / NIR (Band 8)',
      'COMPUTING HIGH-SEVERITY BURN ZONES: 14,200 Hectares categorized > 0.66 dNBR',
      'CORRELATING TOPOGRAPHIC SLOPE: 32-degree ravines created chimney updraft effect',
      'FALSIFICATION PASS: Testing ignition origin hypothesis against wind vector recordings',
      'SIMULATION COMPLETED: Burn severity & recovery prediction package synthesized',
    ],
  },
  {
    id: 'ice-shelf-brunt',
    title: 'Brunt Ice Shelf Rift Propagation',
    region: 'Coats Land, Antarctica',
    coordinates: '75.5500° S, 26.5000° W',
    icon: Wind,
    category: 'Cryospheric Dynamics',
    temporalWindow: 'March 2024 – November 2024',
    question: 'Is the propagation rate of Chasm 1 indicating an imminent tabular iceberg detachment?',
    metrics: {
      sensorCount: 2,
      pixelResolution: '12m (InSAR Interferometric Coherence)',
      anomalyScore: 'Rift Expansion +420m/mo',
      falsificationRate: '0 Contradictions Identified',
    },
    hypotheses: [
      {
        id: 'H1',
        statement: 'Basal ocean warming is thinning the suture zone anchoring the shelf to the McDonald Ice Rumples.',
        expectedState: 'supported',
        confidence: 0.91,
        supportingCount: 4,
        contradictingCount: 0,
      },
    ],
    simulatedLogs: [
      'INITIALIZING SIMULATION: Brunt Ice Shelf Cryospheric Rift (SYNTHETIC)',
      'APPLYING INSAR COHERENCE: Differential phase interferogram indicates high shear displacement',
      'MEASURING CHASM CRACK VELOCITY: Tip advancing at 14.2 meters / day',
      'EVALUATING HYDRO-FRACTURE STRESS: Meltwater pooling absent; shear stress is primary driver',
      'SIMULATION COMPLETED: Structural detachment warning package compiled',
    ],
  },
];

export default function SimulationsPage() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDef>(SCENARIOS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const [simulationFinished, setSimulationFinished] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedLogs]);

  // Run the interactive simulation
  const handleStartSimulation = () => {
    setIsRunning(true);
    setSimulationFinished(false);
    setCurrentStep(1);
    setDisplayedLogs([]);

    const logs = selectedScenario.simulatedLogs;
    let index = 0;

    const interval = setInterval(() => {
      if (index < logs.length) {
        const nextLog = logs[index];
        setDisplayedLogs((prev) => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${nextLog}`]);
        setCurrentStep(Math.min(5, Math.floor(((index + 1) / logs.length) * 5) + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setSimulationFinished(true);
        setCurrentStep(5);
      }
    }, 450);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSimulationFinished(false);
    setCurrentStep(0);
    setDisplayedLogs([]);
  };

  const handleSelectScenario = (sc: ScenarioDef) => {
    setSelectedScenario(sc);
    handleReset();
  };

  return (
    <div className="relative min-h-screen bg-void text-ink">
      <LandingHeader />

      {/* Prominent Scientific Integrity Banner */}
      <aside aria-label="Simulation compliance notice" className="border-b border-warning/40 bg-warning/10 px-5 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-warning">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="font-mono uppercase tracking-wider font-semibold">
              SIMULATION LAB // SYNTHETIC PROVENANCE ENVIRONMENT
            </span>
          </div>
          <span className="hidden md:inline text-ink-dim font-mono text-[11px]">
            Strict adherence to SAATRAAI scientific integrity rules: No simulated data enters production investigation records.
          </span>
        </div>
      </aside>

      {/* Top Console Header */}
      <section className="relative overflow-hidden border-b border-line px-6 py-12 lg:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-void to-void" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
                <Radar className="h-3.5 w-3.5 animate-spin-slow" />
                Live Scenario Simulation Console
              </div>
              <h1 className="display-font mt-4 text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Real-Time <span className="text-primary">Evidence Simulation</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-dim sm:text-base">
                Experience how SAATRAAI synthesizes multi-spectral orbital imagery, extracts bi-temporal deltas,
                flags scientific contradictions, and calculates mathematical hypothesis confidence scores.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                disabled={isRunning}
                onClick={handleStartSimulation}
                className="gap-2 glow-emerald"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Simulating Sensor Sweep...
                  </>
                ) : simulationFinished ? (
                  <>
                    <Play className="h-4 w-4" />
                    Re-run Simulation
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Scenario Simulation
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                disabled={isRunning || (!displayedLogs.length && !simulationFinished)}
                onClick={handleReset}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Scenario Selector Pills */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              const Icon = sc.icon;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc)}
                  className={`text-left rounded-xl p-4 transition-all duration-200 border relative ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(114,227,180,0.15)] ring-1 ring-primary'
                      : 'border-line bg-surface/60 hover:bg-surface hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-faint">
                      {sc.category}
                    </span>
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-ink-dim'}`} />
                  </div>
                  <div className="font-medium text-sm text-ink">{sc.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] text-ink-dim">
                    <MapPin className="h-3 w-3 text-primary" />
                    {sc.region}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Simulation Workbench */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Live Telemetry & Pipeline Stepper */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Scenario Card */}
            <div className="hud-border rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Target Scenario</span>
                  <h2 className="text-lg font-semibold text-ink">{selectedScenario.title}</h2>
                </div>
                <div className="font-mono text-xs text-ink-dim bg-elevated px-3 py-1.5 rounded-lg border border-line">
                  {selectedScenario.coordinates}
                </div>
              </div>

              <div className="mt-4">
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">Natural Language Query</span>
                <p className="mt-1 text-sm font-medium italic text-ink bg-card p-3 rounded-lg border border-line">
                  &ldquo;{selectedScenario.question}&rdquo;
                </p>
              </div>

              {/* Metrics HUD Row */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
                <div className="rounded-lg bg-surface p-3 border border-line/60">
                  <div className="text-[9px] text-ink-faint uppercase">Sensors Fused</div>
                  <div className="mt-1 text-base font-semibold text-secondary">{selectedScenario.metrics.sensorCount} Satellites</div>
                </div>
                <div className="rounded-lg bg-surface p-3 border border-line/60">
                  <div className="text-[9px] text-ink-faint uppercase">Spatial Res</div>
                  <div className="mt-1 text-xs font-semibold text-ink">{selectedScenario.metrics.pixelResolution}</div>
                </div>
                <div className="rounded-lg bg-surface p-3 border border-line/60">
                  <div className="text-[9px] text-ink-faint uppercase">Anomaly Delta</div>
                  <div className="mt-1 text-xs font-semibold text-primary">{selectedScenario.metrics.anomalyScore}</div>
                </div>
                <div className="rounded-lg bg-surface p-3 border border-line/60">
                  <div className="text-[9px] text-ink-faint uppercase">Contradictions</div>
                  <div className="mt-1 text-xs font-semibold text-warning">{selectedScenario.metrics.falsificationRate}</div>
                </div>
              </div>
            </div>

            {/* Pipeline Stage Stepper */}
            <div className="hud-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                  Pipeline Execution Progress
                </span>
                <span className="font-mono text-xs text-ink-dim">
                  Stage {currentStep} of 5
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { step: 1, name: 'Query Tokenization & Spatial Boundary Acquisition', desc: 'Polygon bounding box mapped via PostGIS coordinate system' },
                  { step: 2, name: 'Synthetic Multi-Spectral & SAR Raster Ingestion', desc: 'Normalized C-band backscatter delta + Optical MNDWI calculation' },
                  { step: 3, name: 'Bi-Temporal Delta & Land Cover Coherence Matrix', desc: 'Pixel-level surface transition classification across temporal window' },
                  { step: 4, name: 'Falsification Search & Contradiction Resolution', desc: 'Honest audit testing candidate hypotheses against contradictory sensors' },
                  { step: 5, name: 'Bayesian Confidence Synthesis & Report Generation', desc: 'Immutable provenance hash committed to audit ledger' },
                ].map((st) => {
                  const isDone = currentStep >= st.step;
                  const isCurrent = currentStep === st.step && isRunning;
                  return (
                    <div
                      key={st.step}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(114,227,180,0.15)]'
                          : isDone
                            ? 'border-line bg-surface/70 text-ink'
                            : 'border-line/40 bg-void/40 opacity-50'
                      }`}
                    >
                      <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px] font-bold ${
                        isDone ? 'bg-primary text-void' : 'bg-elevated text-ink-faint border border-line'
                      }`}>
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : st.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-ink flex items-center gap-2">
                          {st.name}
                          {isCurrent && (
                            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-primary/20 text-primary rounded animate-pulse-soft">
                              RUNNING
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-dim mt-0.5">{st.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streaming Log Terminal */}
            <div className="rounded-xl border border-line-strong bg-void p-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-line pb-2 mb-3 text-[10px] text-ink-faint uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                  SIMULATION TELEMETRY STREAM
                </span>
                <span>EXECUTION_ID: SIM-2026-X8</span>
              </div>
              <div
                ref={logContainerRef}
                className="h-44 overflow-y-auto space-y-1.5 text-[11.5px] leading-relaxed text-ink-dim pr-2 font-mono"
              >
                {displayedLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-ink-faint italic">
                    Press &ldquo;Run Scenario Simulation&rdquo; to launch synthetic sensor execution stream...
                  </div>
                ) : (
                  displayedLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-primary/70 shrink-0">&gt;</span>
                      <span className={log.includes('CONTRADICTION') || log.includes('FLAG') ? 'text-warning font-semibold' : log.includes('COMPLETED') ? 'text-primary font-semibold' : 'text-ink-dim'}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Hypotheses & Live Evidence Graph */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hypotheses Evaluation */}
            <div className="hud-border rounded-xl p-6">
              <div className="flex items-center justify-between border-b border-line/60 pb-3 mb-4">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-primary font-semibold">
                  Synthesized Hypotheses
                </span>
                <span className="font-mono text-[10px] text-ink-dim bg-surface px-2 py-0.5 rounded border border-line">
                  {selectedScenario.hypotheses.length} REGISTERED
                </span>
              </div>

              <div className="space-y-4">
                {selectedScenario.hypotheses.map((hyp) => {
                  const isCalculated = simulationFinished || currentStep >= 4;
                  return (
                    <div key={hyp.id} className="rounded-lg border border-line bg-card p-4 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{hyp.id}</span>
                        {isCalculated ? (
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            hyp.expectedState === 'supported'
                              ? 'bg-success/20 text-success border border-success/30'
                              : 'bg-warning/20 text-warning border border-warning/30'
                          }`}>
                            {hyp.expectedState === 'supported' ? 'SUPPORTED' : 'UNDER REVIEW'}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-ink-faint uppercase">
                            AWAITING EVIDENCE
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-ink leading-relaxed font-sans">{hyp.statement}</p>

                      <div className="mt-3 pt-3 border-t border-line/50 flex items-center justify-between text-xs font-mono">
                        <span className="text-ink-dim text-[11px]">Mathematical Confidence:</span>
                        <span className="font-bold text-ink">
                          {isCalculated ? `${Math.round(hyp.confidence * 100)}%` : '—'}
                        </span>
                      </div>

                      {isCalculated && (
                        <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-ink-faint">
                          <span className="text-success flex items-center gap-1">
                            ✓ {hyp.supportingCount} Supporting
                          </span>
                          <span className={hyp.contradictingCount > 0 ? 'text-warning flex items-center gap-1' : ''}>
                            ⚠ {hyp.contradictingCount} Contradicting
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Report Package */}
            <div className="hud-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-ink">Verifiable Audit Package</h3>
              </div>
              <p className="text-xs text-ink-dim leading-relaxed">
                When a simulation completes, an auditable evidence package with tool provenance, raster hash seeds, and falsification records is ready for peer review.
              </p>

              <div className="mt-4 pt-3 border-t border-line/60 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between text-ink-dim">
                  <span>PROVENANCE:</span>
                  <span className="text-ink">SAATRAAI-SIM-0.1.0</span>
                </div>
                <div className="flex justify-between text-ink-dim">
                  <span>HASH VERIFIED:</span>
                  <span className="text-primary truncate max-w-[180px]">
                    {simulationFinished ? 'SHA256: 8a7c29...e04b' : 'PENDING SIMULATION'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <ButtonLink
                  href="/investigations/new"
                  variant="primary"
                  size="md"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  className="w-full justify-center"
                >
                  Clone into Real Investigation
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

